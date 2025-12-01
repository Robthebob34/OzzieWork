import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import clsx from 'clsx';

import { Layout } from '../../components/Layout';
import {
  ApplicationCardMessageMetadata,
  ConversationSummary,
  JobOfferMessageMetadata,
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

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  accepted: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  declined: 'bg-rose-100 text-rose-700 ring-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const formatCurrency = (amount: string, currency: string) => {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch (error) {
    return `${currency} ${numeric.toFixed(2)}`;
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Flexible';
  return new Date(value).toLocaleDateString();
};

const isJobOfferMetadata = (
  metadata: MessageEnvelope['metadata']
): metadata is JobOfferMessageMetadata => {
  return Boolean(metadata && typeof metadata === 'object' && 'kind' in metadata && metadata.kind === 'job_offer');
};

const isApplicationCardMetadata = (
  metadata: MessageEnvelope['metadata']
): metadata is ApplicationCardMessageMetadata => {
  return Boolean(metadata && typeof metadata === 'object' && 'kind' in metadata && metadata.kind === 'application_card');
};

function OfferContractCard({
  metadata,
  showCTA,
}: {
  metadata: JobOfferMessageMetadata;
  showCTA: boolean;
}) {
  const statusStyle = STATUS_STYLES[metadata.status] ?? STATUS_STYLES.pending;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Contract offer</p>
          <p className="text-base font-semibold text-slate-900">{metadata.job_title || 'Untitled role'}</p>
          <p className="text-sm text-slate-500">{metadata.employer_name}</p>
        </div>
        <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold ring-1', statusStyle)}>
          {metadata.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      <dl className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <dt className="font-medium text-slate-900">Start</dt>
          <dd>{formatDate(metadata.start_date)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-medium text-slate-900">End</dt>
          <dd>{formatDate(metadata.end_date)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-medium text-slate-900">Rate</dt>
          <dd>
            {formatCurrency(metadata.rate_amount, metadata.rate_currency)} · {metadata.rate_type}
          </dd>
        </div>
        {metadata.accommodation_details ? (
          <div>
            <dt className="font-medium text-slate-900">Accommodation</dt>
            <dd className="text-slate-600">{metadata.accommodation_details}</dd>
          </div>
        ) : null}
      </dl>
      <div className="flex items-center justify-end">
        {showCTA ? (
          <Link
            href={`/traveller/offer-response/${metadata.application_id}`}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-slate-700"
          >
            Review & respond
          </Link>
        ) : (
          <p className="text-xs text-slate-500">View-only summary</p>
        )}
      </div>
    </div>
  );
}

function ApplicationCard({ metadata }: { metadata: ApplicationCardMessageMetadata }) {
  const applicationLink = `/employer/applications?applicationId=${metadata.application_id}`;
  return (
    <Link
      href={applicationLink}
      className="block rounded-2xl border border-brand-200 bg-white/90 p-4 shadow hover:border-brand-400"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-brand-500">New application</p>
          <p className="text-base font-semibold text-slate-900">{metadata.traveller_name || 'Traveller'}</p>
          <p className="text-sm text-slate-500">{metadata.job_title || 'Job role'}</p>
        </div>
        {metadata.status && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
            {metadata.status.replace('_', ' ')}
          </span>
        )}
      </div>
      {metadata.cover_letter_preview && (
        <p className="mt-3 line-clamp-3 text-sm text-slate-600">{metadata.cover_letter_preview}</p>
      )}
      <p className="mt-3 text-xs font-semibold text-brand-600">Review application →</p>
    </Link>
  );
}

function MessageBubble({
  message,
  isOwn,
  isTraveller,
}: {
  message: MessageEnvelope;
  isOwn: boolean;
  isTraveller: boolean;
}) {
  const offerMetadata = isJobOfferMetadata(message.metadata) ? message.metadata : null;
  const applicationMetadata = isApplicationCardMetadata(message.metadata) ? message.metadata : null;
  const showCTA = Boolean(isTraveller && offerMetadata && offerMetadata.status === 'pending');
  return (
    <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-xl rounded-2xl px-4 py-3 text-sm shadow-sm',
          isOwn ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
        )}
      >
        {offerMetadata ? (
          <div className="space-y-3">
            <OfferContractCard metadata={offerMetadata} showCTA={showCTA} />
            <p className="whitespace-pre-line text-slate-900">{message.body}</p>
          </div>
        ) : applicationMetadata ? (
          <div className="space-y-3">
            <ApplicationCard metadata={applicationMetadata} />
            <p className="whitespace-pre-line text-slate-600">{message.body}</p>
          </div>
        ) : (
          <p className="whitespace-pre-line">{message.body}</p>
        )}
        <span className={clsx('mt-2 block text-[11px]', isOwn ? 'text-brand-100/80' : 'text-slate-400')}>
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
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender === user?.id}
                      isTraveller={Boolean(user?.is_traveller)}
                    />
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
