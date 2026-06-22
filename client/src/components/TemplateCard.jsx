import { PencilIcon, TrashIcon, PaperAirplaneIcon, DocumentDuplicateIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const STATUS_BADGE = {
  APPROVED: 'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
  PENDING:  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  REJECTED: 'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-300',
  LOCAL:    'bg-gray-100   dark:bg-gray-700       text-gray-600   dark:text-gray-300',
  PAUSED:   'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  DISABLED: 'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-300',
};
const STATUS_LABEL = { LOCAL: 'Draft' };

export default function TemplateCard({ template, onEdit, onDelete, onDuplicate, onSend, onSubmit }) {
  const status = template.status || 'LOCAL';
  const statusColor = STATUS_BADGE[status] || STATUS_BADGE.LOCAL;
  const isApproved = status === 'APPROVED';
  const canSubmit  = status === 'LOCAL' || status === 'REJECTED';

  return (
    <div className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{template.name}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
              {STATUS_LABEL[status] || status}
            </span>
            {template.category && (
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{template.category}</span>
            )}
          </div>
          {template.variables.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {template.variables.map((v) => (
                <span key={v} className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px]">
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
          {new Date(template.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Body preview (with optional header/footer) */}
      <div className="text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 flex-1 space-y-1">
        {template.header && <p className="font-semibold text-gray-800 dark:text-gray-100">{template.header}</p>}
        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{template.body}</p>
        {template.footer && <p className="text-xs text-gray-400">{template.footer}</p>}
      </div>

      {/* Rejection reason */}
      {status === 'REJECTED' && template.rejectionReason && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          ⚠ {template.rejectionReason}
        </p>
      )}

      {/* Footer: usage count + actions */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-gray-400">
          {template.usageCount > 0
            ? `Sent to ${template.usageCount} contact${template.usageCount !== 1 ? 's' : ''}`
            : 'Not sent yet'}
        </span>
        <div className="flex gap-1.5">
          {canSubmit ? (
            <button
              onClick={() => onSubmit(template.id)}
              className="btn-primary py-1.5 px-2.5 text-xs"
              title={status === 'REJECTED' ? 'Fix & resubmit to Meta' : 'Submit for approval'}
            >
              <ArrowUpTrayIcon className="w-3.5 h-3.5" /> {status === 'REJECTED' ? 'Resubmit' : 'Submit'}
            </button>
          ) : (
            <button
              onClick={() => isApproved && onSend(template)}
              disabled={!isApproved}
              className="btn-primary py-1.5 px-2.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              title={isApproved ? 'Quick Send' : `Can't send — status is ${status}`}
            >
              <PaperAirplaneIcon className="w-3.5 h-3.5" /> Send
            </button>
          )}
          <button
            onClick={() => onDuplicate(template.id)}
            className="btn-secondary p-1.5"
            title="Duplicate"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(template)}
            className="btn-secondary p-1.5"
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="btn-danger p-1.5"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
