from __future__ import annotations

import operator
import re
from typing import TypedDict, List, Annotated

from langgraph.graph import StateGraph, START, END
from langgraph.types import Send
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.services.cloudinary_service import upload_image

# ============================================================
# STATE
# ============================================================


class State(TypedDict):
    topic: str
    sections: Annotated[List[tuple[int, str]], operator.add]
    final: str
    md_with_placeholders: str
    image_specs: list


# ============================================================
# LLM
# ============================================================


def get_llm(api_key: str):
    return ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)


# ============================================================
# NODES
# ============================================================


def planner_node(state: State, llm):
    res = llm.invoke(
        [
            SystemMessage(content="Create blog outline"),
            HumanMessage(content=state["topic"]),
        ]
    )
    return {"sections": [(1, res.content)]}


def writer_node(state: State, llm):
    content = llm.invoke(
        [
            SystemMessage(content="Write full blog with placeholders like [[IMAGE_1]]"),
            HumanMessage(content=state["sections"][0][1]),
        ]
    )
    return {"md_with_placeholders": content.content}


# ============================================================
# IMAGE PLANNING
# ============================================================


def decide_images(state: State, llm):
    """Extract image requirements from blog content"""
    prompt = f"""Analyze this blog and extract max 2 image search queries (short, simple keywords).
Return ONLY a Python list of dicts like:
[{{"placeholder": "[[IMAGE_1]]", "prompt": "keyword or short phrase for unsplash search"}}, ...]

Blog:
{state['md_with_placeholders']}
"""
    res = llm.invoke([HumanMessage(content=prompt)])

    try:
        # Simple fallback parsing
        content = res.content
        if "[[IMAGE_1]]" in content:
            return {
                "image_specs": [
                    {
                        "placeholder": "[[IMAGE_1]]",
                        "prompt": state["topic"] or "professional business",
                    }
                ]
            }
        return {"image_specs": []}
    except:
        return {
            "image_specs": [
                {
                    "placeholder": "[[IMAGE_1]]",
                    "prompt": state["topic"] or "professional",
                }
            ]
        }


# ============================================================
# GEMINI IMAGE GENERATION
# ============================================================

import requests


def fetch_image_from_unsplash(search_query: str) -> bytes:
    """Fetch image from Unsplash API - instant and free"""
    url = "https://api.unsplash.com/photos/random"
    params = {
        "query": search_query,
        "w": 800,
        "h": 600,
    }
    headers = {
        "Authorization": "Client-ID Z65HKJRpAZ92pjHCXDgQjy7IrAiKLLWTc3lpdAu5f6U"  # Public key
    }

    try:
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        resp.raise_for_status()
        data = resp.json()

        # Download the image
        img_url = data.get("urls", {}).get("regular", "")
        if not img_url:
            raise Exception("No image URL found")

        img_resp = requests.get(img_url, timeout=5)
        img_resp.raise_for_status()
        return img_resp.content
    except Exception as e:
        print(f"Unsplash image fetch failed: {e}")
        raise


def generate_image_bytes(prompt: str, api_key: str) -> bytes:
    """Fallback to Unsplash instead of slow Gemini image generation"""
    return fetch_image_from_unsplash(prompt)


# ============================================================
# IMAGE GENERATION + CLOUDINARY
# ============================================================


def generate_and_replace_images(state: State, api_key: str):
    md = state["md_with_placeholders"]

    for i, spec in enumerate(state["image_specs"], start=1):
        try:
            img_bytes = generate_image_bytes(spec["prompt"], api_key)

            url = upload_image(img_bytes, f"blog_image_{i}")

            img_md = f"![image]({url})"

            md = md.replace(spec["placeholder"], img_md)

        except Exception as e:
            md = md.replace(spec["placeholder"], f"*Image failed: {e}*")

    return {"final": md}


# ============================================================
# GRAPH
# ============================================================


def build_graph(api_key: str):

    llm = get_llm(api_key)

    def planner(state):
        return planner_node(state, llm)

    def writer(state):
        return writer_node(state, llm)

    def image_planner(state):
        return decide_images(state, llm)

    def image_generator(state):
        return generate_and_replace_images(state, api_key)

    g = StateGraph(State)

    g.add_node("planner", planner)
    g.add_node("writer", writer)
    g.add_node("image_planner", image_planner)
    g.add_node("image_generator", image_generator)

    g.add_edge(START, "planner")
    g.add_edge("planner", "writer")
    g.add_edge("writer", "image_planner")
    g.add_edge("image_planner", "image_generator")
    g.add_edge("image_generator", END)

    return g.compile()
