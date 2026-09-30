"""三场景联动卡片生成器 · Markets / Calendar / News card generator.

把原始数据整理成三类卡片：
  - markets：事实 / 来源 / 分析 + 关联日程 + 关联新闻
  - calendar：标题 / 日期 / 类型 / 状态（pending=待确认, confirmed=已落实）
  - news：标题 / 时间 / 来源 / 主题

Agent 闭环：读数据 → LLM 生成（或规则兜底）→ 用户确认 → 跟踪核验。

跑法：
    python generate_card.py data/sample.json
输出：
    打印 JSON 数组，每条按 type 分发到对应模板
确定性兜底：没配 LLM 时，用规则模板生成（不崩），保证 demo 永远能跑。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


# LLM 单例（延迟加载；无模型时走规则模板，不崩）
_model = None
_model_attempted = False


def _get_model():
    global _model, _model_attempted
    if _model_attempted:
        return _model
    _model_attempted = True
    try:
        import os
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "agent-observer-starter-kit" / "agent"))
        from model_factory import ModelSettings, build_chat_model

        base_dir = Path(__file__).resolve().parent.parent.parent / "agent-observer-starter-kit" / "agent"
        settings = ModelSettings.from_environment(base_dir / ".env")
        _model = build_chat_model(settings)
    except Exception:
        _model = None
    return _model


def _llm_card(raw: dict) -> dict | None:
    """LLM 生成路径：按 type 调整提示词。没 LLM / 调用失败 → 返回 None 走兜底。"""
    model = _get_model()
    if model is None:
        return None

    card_type = raw.get("type", "markets")

    if card_type == "markets":
        prompt = (
            "把下面的行情/公告整理成研究卡。只返回 JSON：\n"
            '{"facts": ["..."], "sources": [{"name": "...", "url": "..."}], '
            '"analysis": "...", "cta": "...", "calendar_events_suggestion": '
            '[{"title": "...", "date": "...", "kind": "earnings|meeting", "status": "pending"}]}\n'
            "facts 只写可核实的事实，analysis 写你的判断并标注假设。\n"
            "calendar_events 建议：把公告中的关键日期排进日历（财报发布日、股东大会日等）。"
        )
    elif card_type == "calendar":
        prompt = (
            "把下面的日程条目整理成日历卡。只返回 JSON：\n"
            '{"title": "...", "date": "...", "kind": "earnings|meeting", '
            '"status": "pending|confirmed", "note": "..."}\n'
            "status 必须是 pending（待确认）或 confirmed（已落实）。"
        )
    else:  # news
        prompt = (
            "把下面的新闻条目整理成简报卡。只返回 JSON：\n"
            '{"headline": "...", "published_at": "...", "source": "...", '
            '"link": "...", "topics": ["..."], "summary": "..."}\n'
            "summary 写 1-2 句摘要，topics 列出关联主题。"
        )

    try:
        response = model.invoke(
            [
                ("system", "你是多场景信息助理，严格区分事实与判断。"),
                ("human", json.dumps({"raw": raw, "prompt": prompt}, ensure_ascii=False)),
            ]
        )
    except Exception:
        return None

    text = getattr(response, "content", str(response))
    try:
        value = json.loads(text if isinstance(text, str) else str(text))
        if isinstance(value, dict):
            return value
    except (json.JSONDecodeError, TypeError):
        return None
    return None


def _template_card(raw: dict) -> dict:
    """规则兜底：财经卡（没 LLM 也能出卡，保证 demo 可复现）。"""
    facts = [
        f"{raw.get('ticker', '—')} 现价 {raw.get('price', '—')}",
        f"涨跌幅 {raw.get('change_pct', '—')}",
        f"公告：{raw.get('notice', '（无）')}",
    ]
    return {
        "type": "markets",
        "facts": facts,
        "sources": [{"name": raw.get("source", "练习数据"), "url": ""}],
        "analysis": (
            f"基于当前 {raw.get('change_pct', '—')} 的波动，"
            "短期关注公告落地的执行节奏。此为规则模板输出，未含 LLM 判断。"
        ),
        "cta": "订阅跟踪 → 价格 / 公告再变化时推送",
        "calendar_events": raw.get("calendar_events", []),
        "related_news": raw.get("related_news", []),
        "topics": raw.get("topics", []),
        "_generated_by": "template",
    }


def _calendar_card(raw: dict) -> dict:
    """规则兜底：日历卡。"""
    return {
        "type": "calendar",
        "title": raw.get("title", "（无标题）"),
        "date": raw.get("date", "—"),
        "kind": raw.get("kind", "earnings"),
        "status": raw.get("status", "pending"),
        "related_ticker": raw.get("related_ticker", ""),
        "note": "此为规则模板输出，未含 LLM 判断。",
        "_generated_by": "template",
    }


def _news_card(raw: dict) -> dict:
    """规则兜底：新闻简报卡。"""
    return {
        "type": "news",
        "headline": raw.get("headline", "（无标题）"),
        "published_at": raw.get("published_at", "—"),
        "source": raw.get("source", "练习数据"),
        "link": raw.get("link", ""),
        "topics": raw.get("topics", []),
        "summary": "此为规则模板输出，未含 LLM 摘要。",
        "_generated_by": "template",
    }


def _dispatch(raw: dict) -> dict:
    """按 type 分发：先尝试 LLM，失败则走对应兜底模板。"""
    card_type = raw.get("type", "markets")
    llm_result = _llm_card(raw)

    if card_type == "calendar":
        if llm_result and "title" in llm_result:
            llm_result["type"] = "calendar"
            llm_result["_generated_by"] = "llm"
            return llm_result
        return _calendar_card(raw)

    if card_type == "news":
        if llm_result and "headline" in llm_result:
            llm_result["type"] = "news"
            llm_result["_generated_by"] = "llm"
            return llm_result
        return _news_card(raw)

    # markets（默认）
    if llm_result and "facts" in llm_result:
        llm_result["type"] = "markets"
        llm_result["_generated_by"] = "llm"
        return llm_result
    return _template_card(raw)


def generate_card(raw_path: str | Path) -> list[dict]:
    """生成卡片列表（输入文件是 JSON 数组，每条按 type 分发到对应模板）。"""
    data = json.loads(Path(raw_path).read_text(encoding="utf-8"))
    if isinstance(data, dict):
        data = [data]
    cards = [_dispatch(raw) for raw in data]
    return cards


if __name__ == "__main__":
    if len(sys.argv) < 2:
        default_data = Path(__file__).resolve().parent.parent / "data" / "sample.json"
        sys.argv.append(str(default_data))
    cards = generate_card(sys.argv[1])
    print(json.dumps(cards, ensure_ascii=False, indent=2))
