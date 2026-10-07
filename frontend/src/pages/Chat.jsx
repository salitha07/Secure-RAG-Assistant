import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  askQuestion,
  deleteConversation,
  getConversation,
  getConversations,
} from "../services/api";

import AppLayout from "../components/AppLayout";

import "../styles/chat.css";

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I’m your Secure RAG Assistant. Ask me a question about the company documents you are authorized to access.",
};

function createMessageId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
}

function formatHistoryDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Chat() {
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState([
    welcomeMessage,
  ]);

  const [isAsking, setIsAsking] = useState(false);

  const [conversations, setConversations] =
    useState([]);

  const [
    activeConversationId,
    setActiveConversationId,
  ] = useState(null);

  const [
    isLoadingHistory,
    setIsLoadingHistory,
  ] = useState(false);

  const [
    isLoadingConversation,
    setIsLoadingConversation,
  ] = useState(false);

  const [historyError, setHistoryError] =
    useState("");

  const messagesEndRef = useRef(null);

  /* ==========================================
     Scroll to bottom
  ========================================== */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isAsking]);

  /* ==========================================
     Load conversation history
  ========================================== */

  const loadConversations = useCallback(
    async () => {
      setIsLoadingHistory(true);
      setHistoryError("");

      try {
        const response =
          await getConversations();

        const items = Array.isArray(response)
          ? response
          : response?.conversations ||
            response?.items ||
            response?.data ||
            [];

        setConversations(items);
      } catch (error) {
        console.error(
          "Failed to load conversations:",
          error
        );

        if (error.status === 401) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        setHistoryError(
          "Unable to load chat history."
        );
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /* ==========================================
     Open conversation
  ========================================== */

  const openConversation = useCallback(
    async (conversationId) => {
      if (!conversationId) return;

      setIsLoadingConversation(true);
      setHistoryError("");

      try {
        const response =
          await getConversation(
            conversationId
          );

        const conversation =
          response?.conversation ||
          response;

        const historyMessages =
          conversation?.messages ||
          response?.messages ||
          [];

        const normalizedMessages =
          historyMessages.map(
            (message, index) => ({
              id:
                message.id ||
                `history-${index}-${conversationId}`,

              role:
                message.role ||
                (message.is_user
                  ? "user"
                  : "assistant"),

              content:
                message.content ||
                message.answer ||
                message.question ||
                "",

              citations:
                message.citations || [],
            })
          );

        setMessages(
          normalizedMessages.length
            ? normalizedMessages
            : [welcomeMessage]
        );

        setActiveConversationId(
          conversationId
        );

        navigate("/chat");
      } catch (error) {
        console.error(
          "Failed to open conversation:",
          error
        );

        if (error.status === 401) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        setHistoryError(
          "Unable to open this conversation."
        );
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [navigate]
  );

  /* ==========================================
     New conversation
  ========================================== */

  const startNewConversation = useCallback(
    () => {
      setMessages([welcomeMessage]);

      setQuestion("");

      setActiveConversationId(null);

      setHistoryError("");

      navigate("/chat");
    },
    [navigate]
  );

  /* ==========================================
     Delete conversation
  ========================================== */

  const handleDeleteConversation =
    useCallback(
      async (conversationId) => {
        if (!conversationId) return;

        const confirmed = window.confirm(
          "Delete this conversation?"
        );

        if (!confirmed) return;

        try {
          await deleteConversation(
            conversationId
          );

          setConversations((current) =>
            current.filter(
              (conversation) =>
                String(conversation.id) !==
                String(conversationId)
            )
          );

          if (
            String(activeConversationId) ===
            String(conversationId)
          ) {
            startNewConversation();
          }
        } catch (error) {
          console.error(
            "Failed to delete conversation:",
            error
          );

          if (error.status === 401) {
            navigate("/login", {
              replace: true,
            });

            return;
          }

          setHistoryError(
            "Unable to delete this conversation."
          );
        }
      },
      [
        activeConversationId,
        navigate,
        startNewConversation,
      ]
    );

  /* ==========================================
     Ask question
  ========================================== */

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedQuestion =
      question.trim();

    if (!trimmedQuestion || isAsking) {
      return;
    }

    const userMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setQuestion("");
    setIsAsking(true);
    setHistoryError("");

    try {
      const response = await askQuestion(
        trimmedQuestion,
        activeConversationId
      );

      const answer =
        response?.answer ||
        response?.response ||
        response?.message ||
        "I could not generate an answer.";

      const citations =
        response?.citations || [];

      const assistantMessage = {
        id: createMessageId(),
        role: "assistant",
        content: answer,
        citations,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      if (response?.conversation_id) {
        setActiveConversationId(
          response.conversation_id
        );
      }

      await loadConversations();
    } catch (error) {
      console.error(
        "Failed to ask question:",
        error
      );

      if (error.status === 401) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      const errorMessage = {
        id: createMessageId(),
        role: "assistant",
        content:
          error?.message ||
          "Sorry, something went wrong while processing your question.",
      };

      setMessages((current) => [
        ...current,
        errorMessage,
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  /* ==========================================
     Suggestions
  ========================================== */

  const suggestions = [
    "Summarize the employee handbook.",
    "What information can I access?",
  ];

  function useSuggestion(value) {
    setQuestion(value);
  }

  /* ==========================================
     Render
  ========================================== */

  return (
    <AppLayout
      conversations={conversations}
      activeConversationId={
        activeConversationId
      }
      onOpenConversation={
        openConversation
      }
      onNewConversation={
        startNewConversation
      }
      onDeleteConversation={
        handleDeleteConversation
      }
    >
      <main className="chat-page">

        <section className="chat-main">

          {/* Header */}
          <header className="chat-header">

            <div className="chat-header-top">

              <div>
                <h1>
                  Secure RAG Assistant
                </h1>

                <p>
                  Ask questions about
                  authorized company
                  documents.
                </p>
              </div>

              <button
                type="button"
                className="new-chat-button"
                onClick={
                  startNewConversation
                }
              >
                + New conversation
              </button>

            </div>

          </header>

          {/* Error */}
          {historyError && (
            <div className="chat-history-error">
              {historyError}
            </div>
          )}

          {/* Loading conversation */}
          {isLoadingConversation && (
            <div className="chat-loading">
              Loading conversation...
            </div>
          )}

          {/* Messages */}
          <div className="message-scroll">

            <div className="messages-container">

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-row ${
                    message.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                >

                  <div className="message-avatar">
                    {message.role === "user"
                      ? "U"
                      : "S"}
                  </div>

                  <div className="message-content">

                    <div className="message-bubble">
                      {message.content}
                    </div>

                    {message.citations &&
                      message.citations
                        .length > 0 && (
                        <div className="message-citations">

                          <strong>
                            Sources
                          </strong>

                          {message.citations.map(
                            (
                              citation,
                              index
                            ) => (
                              <div
                                key={
                                  citation.id ||
                                  index
                                }
                                className="citation-item"
                              >
                                {citation.title ||
                                  citation.document_title ||
                                  citation.filename ||
                                  `Source ${index + 1}`}
                              </div>
                            )
                          )}

                        </div>
                      )}

                  </div>

                </div>
              ))}

              {/* Typing indicator */}
              {isAsking && (
                <div className="message-row assistant-message">

                  <div className="message-avatar">
                    S
                  </div>

                  <div className="message-content">

                    <div className="message-bubble typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>

                  </div>

                </div>
              )}

              <div
                ref={messagesEndRef}
              />

            </div>

          </div>

          {/* Suggestions */}
          {messages.length === 1 &&
            !isAsking && (
              <div className="chat-suggestions">

                {suggestions.map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() =>
                        useSuggestion(
                          suggestion
                        )
                      }
                    >
                      {suggestion}
                    </button>
                  )
                )}

              </div>
            )}

          {/* Composer */}
          <form
            className="chat-composer"
            onSubmit={handleSubmit}
          >

            <textarea
              value={question}
              onChange={(event) =>
                setQuestion(
                  event.target.value
                )
              }
              placeholder="Ask a question about your authorized documents..."
              rows={1}
              disabled={isAsking}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();

                  handleSubmit(event);
                }
              }}
            />

            <button
              type="submit"
              disabled={
                isAsking ||
                !question.trim()
              }
            >
              {isAsking
                ? "..."
                : "Send"}
            </button>

          </form>

        </section>

      </main>
    </AppLayout>
  );
}

export default Chat;