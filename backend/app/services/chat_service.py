from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.services.rag_service import retrieve_context


def chat_with_blog(api_key: str, blog_id: int, question: str):
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key
    )

    context = retrieve_context(question, blog_id)

    prompt = f"""
You are answering based ONLY on the blog content.

Context:
{context}

Question:
{question}

Answer clearly.
"""

    response = llm.invoke([
        SystemMessage(content="You are a helpful assistant"),
        HumanMessage(content=prompt)
    ])

    return response.content