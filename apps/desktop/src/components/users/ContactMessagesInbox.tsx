import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Inbox,
  Mail,
  MailOpen,
  CheckCircle2,
  Trash2,
  Search,
  RefreshCw,
  Phone,
  Calendar,
  Clock,
  Send,
  Loader2,
  Check,
  AlertCircle,
  Archive,
  MessageSquare,
  FileText,
  CornerUpLeft,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ContactMessage } from '@wewala/shared';

export type ContactStatus = 'unread' | 'read' | 'resolved';

export type ContactMessageWithStatus = ContactMessage;

interface ContactMessagesInboxProps {
  onUnreadCountChange?: (unreadCount: number) => void;
}

export const ContactMessagesInbox: React.FC<ContactMessagesInboxProps> = ({
  onUnreadCountChange,
}) => {
  const [messages, setMessages] = useState<ContactMessageWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessageWithStatus | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | ContactStatus>('all');
  const [search, setSearch] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Admin note editing
  const [adminNote, setAdminNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalized: ContactMessageWithStatus[] = (data || []).map((m: any) => ({
        ...m,
        status: m.status || (m.is_read ? 'read' : 'unread'),
      }));

      setMessages(normalized);

      // Keep selected message in sync if updated
      if (selectedMessage) {
        const found = normalized.find((m) => m.id === selectedMessage.id);
        if (found) {
          setSelectedMessage(found);
          setAdminNote(found.admin_notes || '');
        }
      }
    } catch (err) {
      console.warn('Error fetching contact messages:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMessage?.id]);

  useEffect(() => {
    fetchMessages();
  }, []);

  // Update parent with unread count
  useEffect(() => {
    const unreadCount = messages.filter((m) => (m.status || (m.is_read ? 'read' : 'unread')) === 'unread').length;
    onUnreadCountChange?.(unreadCount);
  }, [messages, onUnreadCountChange]);

  // Sync adminNote when selectedMessage changes
  useEffect(() => {
    if (selectedMessage) {
      setAdminNote(selectedMessage.admin_notes || '');
      setNoteSavedFeedback(false);
    }
  }, [selectedMessage?.id]);

  // Counts
  const counts = useMemo(() => {
    const res = { all: messages.length, unread: 0, read: 0, resolved: 0 };
    messages.forEach((m) => {
      const st = m.status || (m.is_read ? 'read' : 'unread');
      if (st === 'unread') res.unread += 1;
      else if (st === 'read') res.read += 1;
      else if (st === 'resolved') res.resolved += 1;
    });
    return res;
  }, [messages]);

  // Filtered messages
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      const currentStatus = msg.status || (msg.is_read ? 'read' : 'unread');
      if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        msg.name.toLowerCase().includes(term) ||
        msg.email.toLowerCase().includes(term) ||
        (msg.subject && msg.subject.toLowerCase().includes(term)) ||
        msg.message.toLowerCase().includes(term) ||
        (msg.phone && msg.phone.includes(term))
      );
    });
  }, [messages, statusFilter, search]);

  // Moderate single message
  const handleModerateSingle = async (
    messageId: string,
    action: 'unread' | 'read' | 'resolved' | 'delete',
    notes?: string
  ) => {
    setIsProcessing(true);
    try {
      // 1. Try RPC
      const { data, error } = await supabase.rpc('admin_moderate_contact_messages', {
        p_message_ids: [messageId],
        p_action: action,
        p_admin_notes: notes,
      });

      if (error || !data?.success) {
        // Fallback: direct table operations
        if (action === 'delete') {
          await supabase.from('contact_messages').delete().eq('id', messageId);
        } else {
          const isRead = action === 'read' || action === 'resolved';
          await supabase
            .from('contact_messages')
            .update({
              status: action,
              is_read: isRead,
              resolved_at: action === 'resolved' ? new Date().toISOString() : null,
              admin_notes: notes !== undefined ? notes : undefined,
            })
            .eq('id', messageId);
        }
      }

      // Optimistic local update
      if (action === 'delete') {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        if (selectedMessage?.id === messageId) setSelectedMessage(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      } else {
        const isRead = action === 'read' || action === 'resolved';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  status: action,
                  is_read: isRead,
                  resolved_at: action === 'resolved' ? new Date().toISOString() : null,
                  admin_notes: notes !== undefined ? notes : m.admin_notes,
                }
              : m
          )
        );

        if (selectedMessage?.id === messageId) {
          setSelectedMessage((prev) =>
            prev
              ? {
                  ...prev,
                  status: action,
                  is_read: isRead,
                  resolved_at: action === 'resolved' ? new Date().toISOString() : null,
                  admin_notes: notes !== undefined ? notes : prev.admin_notes,
                }
              : null
          );
        }
      }
    } catch (err: any) {
      alert(`Action failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: 'unread' | 'read' | 'resolved' | 'delete') => {
    if (selectedIds.size === 0) return;

    if (
      action === 'delete' &&
      !confirm(`Permanently delete ${selectedIds.size} selected contact inquiry(s)?`)
    ) {
      return;
    }

    setIsProcessing(true);
    const ids = Array.from(selectedIds);

    try {
      const { data, error } = await supabase.rpc('admin_moderate_contact_messages', {
        p_message_ids: ids,
        p_action: action,
      });

      if (error || !data?.success) {
        // Fallback
        for (const id of ids) {
          await handleModerateSingle(id, action);
        }
      } else {
        await fetchMessages();
      }

      setSelectedIds(new Set());
    } catch (err: any) {
      alert(`Bulk action failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save admin notes
  const handleSaveNotes = async () => {
    if (!selectedMessage) return;
    setIsSavingNote(true);
    try {
      await handleModerateSingle(
        selectedMessage.id,
        selectedMessage.status || (selectedMessage.is_read ? 'read' : 'unread'),
        adminNote
      );
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 2500);
    } catch (err) {
      console.warn('Error saving note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Selection toggle
  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMessages.length && filteredMessages.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMessages.map((m) => m.id)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Inbox size={22} className="text-brand-500" />
            <span>Customer Contact Inbox</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Store inquiries, support messages, feedback, and customer tickets submitted via Contact Us
          </p>
        </div>

        <button
          onClick={fetchMessages}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Inbox</span>
        </button>
      </div>

      {/* Main Inbox Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        {/* Left Column: Message List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {/* Filters & Search */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages by name, email, subject..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 pl-8 text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>All</span>
                <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[10px]">
                  {counts.all}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('unread')}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100'
                }`}
              >
                <span>Unread</span>
                <span className="rounded-full bg-blue-200 dark:bg-blue-900 px-1.5 py-0.2 text-[10px]">
                  {counts.unread}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('read')}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === 'read'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>Read</span>
                <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[10px]">
                  {counts.read}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('resolved')}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === 'resolved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <span>Resolved</span>
                <span className="rounded-full bg-emerald-200 dark:bg-emerald-900 px-1.5 py-0.2 text-[10px]">
                  {counts.resolved}
                </span>
              </button>
            </div>

            {/* Bulk Toolbar */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={
                    filteredMessages.length > 0 &&
                    selectedIds.size === filteredMessages.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                />
                <span>Select All ({selectedIds.size})</span>
              </label>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleBulkAction('read')}
                    disabled={isProcessing}
                    title="Mark selected as read"
                    className="rounded-lg p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    <MailOpen size={14} />
                  </button>
                  <button
                    onClick={() => handleBulkAction('resolved')}
                    disabled={isProcessing}
                    title="Mark selected as resolved"
                    className="rounded-lg p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                  >
                    <CheckCircle2 size={14} />
                  </button>
                  <button
                    onClick={() => handleBulkAction('unread')}
                    disabled={isProcessing}
                    title="Mark selected as unread"
                    className="rounded-lg p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                  >
                    <Mail size={14} />
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    disabled={isProcessing}
                    title="Delete selected"
                    className="rounded-lg p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* List of messages */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-[580px]">
            {loading ? (
              <div className="py-16 text-center">
                <Loader2 size={24} className="animate-spin text-brand-500 mx-auto" />
                <p className="text-xs text-slate-400 mt-2">Loading messages...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 p-6">
                <Mail size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                No messages found matching your filter criteria.
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const status = msg.status || (msg.is_read ? 'read' : 'unread');
                const isSelected = selectedMessage?.id === msg.id;
                const isChecked = selectedIds.has(msg.id);

                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      // Auto mark as read if unread
                      if (status === 'unread') {
                        handleModerateSingle(msg.id, 'read');
                      }
                    }}
                    className={`p-3.5 cursor-pointer transition relative flex items-start gap-3 ${
                      isSelected
                        ? 'bg-brand-50/70 dark:bg-brand-950/30 border-l-4 border-l-brand-500'
                        : status === 'unread'
                        ? 'bg-blue-50/40 dark:bg-blue-950/10 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="pt-0.5" onClick={(e) => toggleSelectOne(msg.id, e)}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Sender & Timestamp */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {status === 'unread' && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                          <span
                            className={`text-xs truncate ${
                              status === 'unread'
                                ? 'font-black text-slate-900 dark:text-white'
                                : 'font-semibold text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {msg.name}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(msg.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Subject */}
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          status === 'unread'
                            ? 'font-bold text-slate-800 dark:text-slate-200'
                            : 'font-medium text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {msg.subject || '(No subject)'}
                      </p>

                      {/* Message preview snippet */}
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {msg.message}
                      </p>

                      {/* Status badge */}
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className={`rounded-full px-2 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                            status === 'unread'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {status}
                        </span>

                        {msg.admin_notes && (
                          <span className="text-[10px] text-brand-600 dark:text-brand-400 flex items-center gap-0.5 font-medium">
                            <MessageSquare size={10} /> Note
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Reading & Detail Pane (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {selectedMessage ? (
            <div className="flex-1 flex flex-col h-full overflow-y-auto">
              {/* Message Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4 bg-slate-50/30 dark:bg-slate-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-base">
                      {selectedMessage.name?.[0]?.toUpperCase() || 'M'}
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {selectedMessage.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <a
                          href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(
                            selectedMessage.subject || 'Store Inquiry'
                          )}`}
                          className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline flex items-center gap-1"
                        >
                          <Mail size={12} /> {selectedMessage.email}
                        </a>
                        {selectedMessage.phone && (
                          <a
                            href={`tel:${selectedMessage.phone}`}
                            className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline flex items-center gap-1"
                          >
                            <Phone size={12} /> {selectedMessage.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        (selectedMessage.status || (selectedMessage.is_read ? 'read' : 'unread')) ===
                        'unread'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200'
                          : (selectedMessage.status ||
                              (selectedMessage.is_read ? 'read' : 'unread')) === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200'
                      }`}
                    >
                      {selectedMessage.status || (selectedMessage.is_read ? 'read' : 'unread')}
                    </span>
                  </div>
                </div>

                {/* Quick Moderation Toolbar */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {/* Mark as Resolved button */}
                    <button
                      onClick={() =>
                        handleModerateSingle(
                          selectedMessage.id,
                          selectedMessage.status === 'resolved' ? 'read' : 'resolved'
                        )
                      }
                      disabled={isProcessing}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                        selectedMessage.status === 'resolved'
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <CheckCircle2 size={13} />
                      <span>
                        {selectedMessage.status === 'resolved'
                          ? 'Re-open Inquiry'
                          : 'Mark as Resolved'}
                      </span>
                    </button>

                    {/* Mark as Unread toggle */}
                    <button
                      onClick={() =>
                        handleModerateSingle(
                          selectedMessage.id,
                          selectedMessage.status === 'unread' ? 'read' : 'unread'
                        )
                      }
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 text-xs font-semibold transition"
                    >
                      {selectedMessage.status === 'unread' ? (
                        <>
                          <MailOpen size={13} />
                          <span>Mark as Read</span>
                        </>
                      ) : (
                        <>
                          <Mail size={13} />
                          <span>Mark as Unread</span>
                        </>
                      )}
                    </button>

                    {/* Reply Mailto link */}
                    <a
                      href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(
                        selectedMessage.subject || 'Wewala Stores Inquiry'
                      )}&body=Dear ${encodeURIComponent(selectedMessage.name)},\n\nThank you for reaching out to Wewala Stores.\n\n`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 text-brand-700 dark:text-brand-300 px-3 py-1.5 text-xs font-bold transition"
                    >
                      <CornerUpLeft size={13} />
                      <span>Reply via Email</span>
                    </a>
                  </div>

                  {/* Delete message */}
                  <button
                    onClick={() => {
                      if (confirm('Permanently delete this customer contact inquiry?')) {
                        handleModerateSingle(selectedMessage.id, 'delete');
                      }
                    }}
                    disabled={isProcessing}
                    className="rounded-xl p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                    title="Delete message"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Message Content & Subject */}
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Subject
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {selectedMessage.subject || '(No Subject)'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>Received on {new Date(selectedMessage.created_at).toLocaleString()}</span>
                    {selectedMessage.resolved_at && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        • Resolved on {new Date(selectedMessage.resolved_at).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>

                {/* Message Body Card */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-5 leading-relaxed text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans">
                  {selectedMessage.message}
                </div>

                {/* Internal Admin Notes */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MessageSquare size={13} />
                      <span>Internal Administrator Notes</span>
                    </span>
                    {noteSavedFeedback && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check size={12} /> Saved
                      </span>
                    )}
                  </div>

                  <textarea
                    rows={3}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Log internal follow-up notes, phone call summaries, resolution status..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNote}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-1.5 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition disabled:opacity-50"
                    >
                      {isSavingNote && <Loader2 size={12} className="animate-spin" />}
                      <span>Save Notes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <Mail size={48} className="text-slate-200 dark:text-slate-800 mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Message Selected
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Select a customer inquiry or support ticket from the list on the left to read its full message, reply, or update its resolution status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

