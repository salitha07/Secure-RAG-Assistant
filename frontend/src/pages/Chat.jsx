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
  getCurrentUser,
  logoutUser,
} from "../services/api";

import "../styles/chat.css";


const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  text: (
    "Welcome to Secure RAG Assistant. "
    + "Ask a question and I will answer using "
    + "only the documents your role can access."
  ),
  citations: [],
};


const AUDIT_ROLES = [
  "executive",
  "admin",
];


function createMessageId() {
  return crypto.randomUUID();
}


function formatRole(role) {
  if (!role) {
    return "Loading...";
  }

  return (
    role.charAt(0).toUpperCase()
    + role.slice(1)
  );
}


function getInitials(name) {
  if (!name) {
    return "U";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}


function formatHistoryDate(dateValue) {
  return new Date(dateValue).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    },
  );
}


function Chat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [user, setUser] = useState(null);
  const [profileError, setProfileError] =
    useState("");

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    welcomeMessage,
  ]);
  const [isAsking, setIsAsking] =
    useState(false);

  const [
    conversations,
    setConversations,
  ] = useState([]);

  const [
    activeConversationId,
    setActiveConversationId,
  ] = useState(null);

  const [
    isLoadingHistory,
    setIsLoadingHistory,
  ] = useState(true);

  const [
    isLoadingConversation,
    setIsLoadingConversation,
  ] = useState(false);

  const [historyError, setHistoryError] =
    useState("");


  const loadConversationHistory = useCallback(
    async () => {
      setIsLoadingHistory(true);
      setHistoryError("");

      try {
        const response = await getConversations({
          limit: 50,
          offset: 0,
        });

        setConversations(response.items ?? []);
      } catch (error) {
        if (error.status === 401) {
          navigate("/login", {
            replace: true,
          });
          return;
        }

        setHistoryError(error.message);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [navigate],
  );


  useEffect(() => {
    let isActive = true;

    getCurrentUser()
      .then((profile) => {
        if (isActive) {
          setUser(profile);
        }
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        if (error.status === 401) {
          navigate("/login", {
            replace: true,
          });
          return;
        }

        setProfileError(error.message);
      });

    return () => {
      isActive = false;
    };
  }, [navigate]);


  useEffect(() => {
    loadConversationHistory();
  }, [loadConversationHistory]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isAsking]);


  const suggestions =
    user?.role === "executive"
      ? [
          "What is Project Aurora?",
          "Summarize the executive strategy.",
        ]
      : user?.role === "admin"
        ? []
        : [
            "Summarize the employee handbook.",
            "What information can I access?",
          ];


  async function handleOpenConversation(
    conversationId,
  ) {
    if (
      isAsking
      || isLoadingConversation
      || conversationId === activeConversationId
    ) {
      return;
    }

    setIsLoadingConversation(true);
    setHistoryError("");

    try {
      const response = await getConversation(
        conversationId,
      );

      const loadedMessages = response.messages.map(
        (message) => ({
          id: message.id,
          role: message.role,
          text: message.content,
          citations: message.citations ?? [],
        }),
      );

      setActiveConversationId(response.id);
      setMessages(
        loadedMessages.length > 0
          ? loadedMessages
          : [welcomeMessage],
      );
      setQuestion("");
    } catch (error) {
      if (error.status === 401) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setHistoryError(error.message);
    } finally {
      setIsLoadingConversation(false);
    }
  }


  async function handleDeleteConversation(
    event,
    conversationId,
  ) {
    event.stopPropagation();

    const shouldDelete = window.confirm(
      "Delete this conversation permanently?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteConversation(conversationId);

      if (
        activeConversationId === conversationId
      ) {
        startNewConversation();
      }

      await loadConversationHistory();
    } catch (error) {
      if (error.status === 401) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setHistoryError(error.message);
    }
  }


  async function handleSubmit(event) {
    event.preventDefault();

    const cleanedQuestion = question.trim();

    if (!cleanedQuestion || isAsking) {
      return;
    }

    const userMessage = {
      id: createMessageId(),
      role: "user",
      text: cleanedQuestion,
      citations: [],
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setQuestion("");
    setIsAsking(true);

    try {
      const response = await askQuestion(
        cleanedQuestion,
        activeConversationId,
      );

      setActiveConversationId(
        response.conversation_id,
      );

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          text: response.answer,
          citations: response.citations ?? [],
        },
      ]);

      await loadConversationHistory();
    } catch (error) {
      if (error.status === 401) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "error",
          text:
            error.message
            ?? "The request could not be completed.",
          citations: [],
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  }


  function handleLogout() {
    logoutUser();

    navigate("/login", {
      replace: true,
    });
  }


  function startNewConversation() {
    if (isAsking) {
      return;
    }

    setActiveConversationId(null);
    setMessages([welcomeMessage]);
    setQuestion("");
  }


  const canViewAudit =
    user
    && AUDIT_ROLES.includes(user.role);


  return (
    <main className="chat-page">
      <aside className="chat-sidebar">
        <div className="chat-brand">
          <div className="brand-icon">S</div>

          <div>
            <strong>Secure RAG</strong>
            <span>Knowledge Assistant</span>
          </div>
        </div>

        <button
          type="button"
          className="new-chat-button"
          onClick={startNewConversation}
          disabled={isAsking}
        >
          <span>+</span>
          New conversation
        </button>

        {canViewAudit && (
          <button
            type="button"
            className="audit-dashboard-link"
            onClick={() => navigate("/audit")}
          >
            <span>✓</span>
            Audit Dashboard
          </button>
        )}

        <div className="history-section">
          <div className="history-heading">
            <span>Chat history</span>

            <button
              type="button"
              aria-label="Refresh chat history"
              title="Refresh history"
              onClick={loadConversationHistory}
              disabled={isLoadingHistory}
            >
              ↻
            </button>
          </div>

          <div className="history-list">
            {isLoadingHistory && (
              <p className="history-status">
                Loading history...
              </p>
            )}

            {!isLoadingHistory
              && historyError
              && (
                <p className="history-status error">
                  {historyError}
                </p>
              )}

            {!isLoadingHistory
              && !historyError
              && conversations.length === 0
              && (
                <p className="history-status">
                  No saved conversations yet.
                </p>
              )}

            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={
                  "history-item"
                  + (
                    conversation.id
                    === activeConversationId
                      ? " active"
                      : ""
                  )
                }
              >
                <button
                  type="button"
                  className="history-open-button"
                  disabled={
                    isAsking
                    || isLoadingConversation
                  }
                  onClick={() =>
                    handleOpenConversation(
                      conversation.id,
                    )
                  }
                >
                  <span title={conversation.title}>
                    {conversation.title}
                  </span>

                  <small>
                    {formatHistoryDate(
                      conversation.updated_at,
                    )}
                  </small>
                </button>

                <button
                  type="button"
                  className="history-delete-button"
                  aria-label={
                    `Delete ${conversation.title}`
                  }
                  title="Delete conversation"
                  disabled={isAsking}
                  onClick={(event) =>
                    handleDeleteConversation(
                      event,
                      conversation.id,
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="security-panel">
          <span className="security-indicator" />

          <div>
            <strong>Role protection active</strong>
            <p>
              Answers are filtered using your
              verified database role.
            </p>
          </div>
        </div>

        <div className="profile-summary">
          <div className="profile-avatar">
            {getInitials(user?.full_name)}
          </div>

          <div className="profile-meta">
            <strong>
              {user?.full_name ?? "Loading profile"}
            </strong>

            <span>
              {profileError
                || user?.email
                || "Please wait..."}
            </span>

            <small>
              {formatRole(user?.role)} access
            </small>
          </div>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </aside>

      <section className="chat-main">
        <header className="chat-header">
          <div>
            <p className="eyebrow">
              SECURE WORKSPACE
            </p>
            <h1>Company Knowledge Assistant</h1>
          </div>

          <div className="header-role">
            <span className="header-lock">✓</span>
            {formatRole(user?.role)}
          </div>
        </header>

        <div
          className="message-scroll"
          aria-live="polite"
        >
          <div className="messages-container">
            {isLoadingConversation && (
              <div className="conversation-loading">
                Loading conversation...
              </div>
            )}

            {!isLoadingConversation
              && messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    `message-row ${message.role}`
                  }
                >
                  <div className="message-avatar">
                    {message.role === "user"
                      ? getInitials(user?.full_name)
                      : "S"}
                  </div>

                  <div className="message-content">
                    <span className="message-author">
                      {message.role === "user"
                        ? "You"
                        : message.role === "error"
                          ? "System"
                          : "Secure RAG"}
                    </span>

                    <div className="message-bubble">
                      {message.text}
                    </div>

                    {message.citations.length > 0 && (
                      <div className="citations">
                        <p>Verified sources</p>

                        {message.citations.map(
                          (citation) => (
                            <div
                              className="citation-card"
                              key={
                                `${citation.document_id}-`
                                + citation.chunk_id
                              }
                            >
                              <div>
                                <span>
                                  Source{" "}
                                  {citation.source_number}
                                </span>

                                <strong>
                                  {citation.title}
                                </strong>
                              </div>

                              <small>
                                {Math.round(
                                  citation.score * 100,
                                )}
                                % match
                              </small>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}

            {isAsking && (
              <article className="message-row assistant">
                <div className="message-avatar">S</div>

                <div className="message-content">
                  <span className="message-author">
                    Secure RAG
                  </span>

                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </article>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="composer-section">
          {messages.length === 1
            && !activeConversationId
            && suggestions.length > 0
            && (
              <div className="suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() =>
                      setQuestion(suggestion)
                    }
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

          <form
            className="composer"
            onSubmit={handleSubmit}
          >
            <textarea
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                  && !event.shiftKey
                ) {
                  event.preventDefault();
                  event.currentTarget.form
                    ?.requestSubmit();
                }
              }}
              maxLength={1000}
              rows={1}
              placeholder="Ask an authorized question..."
              aria-label="Question"
              disabled={
                isAsking || isLoadingConversation
              }
            />

            <button
              type="submit"
              disabled={
                !question.trim()
                || isAsking
                || isLoadingConversation
              }
              aria-label="Send question"
            >
              ↑
            </button>
          </form>

          <div className="composer-details">
            <span>
              Answers use authorized evidence only.
            </span>
            <span>{question.length}/1000</span>
          </div>
        </footer>
      </section>
    </main>
  );
}


export default Chat;