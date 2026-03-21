from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from typing import TypedDict, List
import operator


# -----------------------------
# STATE
# -----------------------------
class State(TypedDict):
    topic: str
    sections: List[str]
    final: str


# -----------------------------
# DYNAMIC LLM
# -----------------------------
def get_llm(api_key: str):
    return ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)


# -----------------------------
# NODES
# -----------------------------
def planner_node(state: State, llm):
    plan = llm.invoke(
        [
            SystemMessage(content="Create a blog outline"),
            HumanMessage(content=state["topic"]),
        ]
    )
    return {"sections": [plan.content]}


def writer_node(state: State, llm):
    content = llm.invoke(
        [
            SystemMessage(content="Write a full blog"),
            HumanMessage(content=state["sections"][0]),
        ]
    )
    return {"final": content.content}


# -----------------------------
# GRAPH BUILDER
# -----------------------------
def build_graph(api_key: str):
    llm = get_llm(api_key)

    def planner(state):
        return planner_node(state, llm)

    def writer(state):
        return writer_node(state, llm)

    g = StateGraph(State)

    g.add_node("planner", planner)
    g.add_node("writer", writer)

    g.add_node(START, "planner")
    g.add_edge("planner", "writer")
    g.add_edge("writer", END)

    return g.compile()
