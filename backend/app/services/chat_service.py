from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.services.rag_service import retrieve_context


def chat_with_blog(api_key: str, blog_id: int, question: str):
    """Chat with blog content using RAG retrieval + LLM."""
    try:
        print(f"Chat request: blog_id={blog_id}, question='{question[:60]}...'")

        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)

        context = retrieve_context(question, blog_id)

        # Check if context was retrieved
        if not context or context.strip() == "":
            print(f"No context retrieved for blog {blog_id}")
            return "I'm sorry, but I couldn't find the blog content. The blog may not have been indexed yet. Please try again in a moment, or regenerate the blog."

        prompt = f"""You are answering questions based ONLY on the provided blog content.

Blog Content:
{context}

Question from user:
{question}

Answer the question clearly and accurately based only on the blog content above. If the answer is not in the blog content, say so."""

        response = llm.invoke(
            [
                SystemMessage(
                    content="You are a helpful assistant that answers questions based on blog content."
                ),
                HumanMessage(content=prompt),
            ]
        )

        answer = response.content
        print(f"Chat response generated ({len(answer)} chars)")
        return answer

    except Exception as e:
        error_msg = f"Error in chat: {str(e)}"
        print(f"{error_msg}")
        import traceback

        traceback.print_exc()
        return f"An error occurred while processing your question: {str(e)}"
