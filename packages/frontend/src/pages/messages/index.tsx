import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import clsx from 'clsx';

import { Layout } from '../../components/Layout';
import {
  ConversationSummary,
  MessageEnvelope,
  fetchConversations,
  fetchConversationMessages,
  sendConversationReply,
} from '../../lib/api';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: ConversationSummary;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex w-full flex-col rounded-2xl border px-4 py-3 text-left transition',
        isActive
          ? 'border-brand-200 bg-brand-50/70 shadow'
          : 'border-transparent hover:bg-slate-100/60'
      )}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-800">{conversation.other_participant_name}</span>
        <span className="text-xs text-slate-400">{new Date(conversation.last_message_at).toLocaleString()}</span>
      </div>
      {conversation.job_title && (
        <p className="text-xs text-slate-500">{conversation.job_title}</p>
      )}
      {conversation.last_message_preview && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{conversation.last_message_preview}</p>
      )}
    </button>
  );
}

function MessageBubble({ message, isOwn }: { message: MessageEnvelope; isOwn: boolean }) {
  return (
    <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-xl rounded-2xl px-4 py-2 text-sm shadow-sm',
          isOwn ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
        )}
      >
        <p className="whitespace-pre-line">{message.body}</p>
        <span className={clsx('mt-1 block text-[11px]', isOwn ? 'text-brand-100/80' : 'text-slate-400')}>
          {new Date(message.created_at).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, initializing, unauthorized } = useAuthRedirect();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const {
    data: conversations,
    error: conversationsError,
    isLoading: loadingConversations,
    mutate: mutateConversations,
  } = useSWR<ConversationSummary[]>(user ? ['conversations'] : null, fetchConversations);
  const {
    data: messages,
    error: messagesError,
    mutate: mutateMessages,
    isLoading: loadingMessages,
  } = useSWR<MessageEnvelope[] | null>(
    selectedConversationId ? ['messages', selectedConversationId] : null,
    () => fetchConversationMessages(selectedConversationId as number)
  );

  useEffect(() => {
    if (!selectedConversationId && conversations && conversations.length) {
      const queryConv = router.query.conversation;
      if (queryConv) {
        const numericId = Number(queryConv);
        if (!Number.isNaN(numericId)) {
          setSelectedConversationId(numericId);
          return;
        }
      }
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId, router.query.conversation]);

  const activeConversation = useMemo(() => {
    return conversations?.find((conv) => conv.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const otherParticipantId = useMemo(() => {
    if (!activeConversation || !user) {
      return null;
    }
    if (user.id === activeConversation.employer) {
      return activeConversation.traveller;
    }
    if (user.id === activeConversation.traveller) {
      return activeConversation.employer;
    }
    return activeConversation.traveller || activeConversation.employer;
  }, [activeConversation, user]);

  const handleSend = async () => {
    if (!draftMessage.trim() || !selectedConversationId) {
      return;
    }
    setSending(true);
    try {
      const newMessage = await sendConversationReply(selectedConversationId, draftMessage.trim());
      await mutateMessages((current) => (current ? [...current, newMessage] : [newMessage]), false);
      mutateMessages();
      mutateConversations();
      setDraftMessage('');
    } catch (error) {
      // Ideally show toast
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  if (initializing || !user) {
    return (
      <Layout title="Messages">
        <p className="text-slate-500">Loading your messages…</p>
      </Layout>
    );
  }

  if (unauthorized) {
    return (
      <Layout title="Messages">
        <p className="text-slate-500">Redirecting to login…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Messages">
      <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 lg:flex-row">
        <aside className="w-full rounded-3xl border border-slate-200 bg-white p-4 lg:w-1/3">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Conversations</h2>
          <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
            {conversationsError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                Unable to load conversations.
              </p>
            )}
            {loadingConversations && <p className="text-sm text-slate-400">Loading…</p>}
            {conversations?.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === selectedConversationId}
                onClick={() => setSelectedConversationId(conversation.id)}
              />
            ))}
            {!conversations?.length && !loadingConversations && (
              <p className="text-sm text-slate-500">No conversations yet.</p>
            )}
          </div>
        </aside>

        <section className="flex w-full flex-1 flex-col rounded-3xl border border-slate-200 bg-white">
          {activeConversation ? (
            <>
              <header className="border-b border-slate-100 p-4">
                <div className="text-sm text-slate-500">Conversation</div>
                {otherParticipantId ? (
                  <Link
                    href={`/profiles/${otherParticipantId}`}
                    className="text-xl font-semibold text-brand-600 hover:text-brand-500"
                  >
                    {activeConversation.other_participant_name}
                  </Link>
                ) : (
                  <h2 className="text-xl font-semibold text-slate-900">
                    {activeConversation.other_participant_name}
                  </h2>
                )}
                {activeConversation.job_title && (
                  <p className="text-sm text-slate-500">Job: {activeConversation.job_title}</p>
                )}
              </header>
              <div className="flex-1 overflow-y-auto p-4" ref={scrollRef} id="messages-scroll">
                <div className="space-y-3">
                  {messagesError && (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                      Unable to load messages.
                    </p>
                  )}
                  {loadingMessages && <p className="text-sm text-slate-400">Loading…</p>}
                  {messages?.map((message) => (
                    <MessageBubble key={message.id} message={message} isOwn={message.sender === user?.id} />
                  ))}
                  {!messages?.length && !loadingMessages && (
                    <p className="text-sm text-slate-400">Say hi to kick off the conversation.</p>
                  )}
                </div>
              </div>
              <footer className="border-t border-slate-100 p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    className="h-24 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    placeholder="Type a message..."
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draftMessage.trim() || sending}
                    className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-brand-300"
                  >
                    Send
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-slate-500">Select a conversation to start messaging.</p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
