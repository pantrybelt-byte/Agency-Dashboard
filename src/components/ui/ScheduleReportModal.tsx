import React, { useId, useState } from 'react';
import { CalendarClock, Info } from 'lucide-react';
import { Modal } from './Modal';
import type { ReportFormat, ReportFrequency, ReportTemplate, ScheduledReport } from '../../types';
import {
  WEEKDAYS,
  computeNextRun,
  describeSchedule,
  findInvalidRecipients,
  parseRecipients,
} from '../../utils/reportSchedule';
import { ALL_COUNTIES } from '../../utils/scoping';

interface ScheduleReportModalProps {
  open: boolean;
  onClose: () => void;
  templates: ReportTemplate[];
  assignedCounties: string[];
  regionLabel: string;
  defaultCountyScope: string;
  createdBy: string;
  onSchedule: (report: ScheduledReport) => Promise<void> | void;
}

const FREQUENCIES: { value: ReportFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const FORMATS: { value: ReportFormat; label: string; hint: string }[] = [
  { value: 'csv', label: 'CSV', hint: 'Spreadsheet data for analysts' },
  { value: 'pdf', label: 'PDF', hint: 'Co-branded document for funders' },
];

export const ScheduleReportModal: React.FC<ScheduleReportModalProps> = ({
  open,
  onClose,
  templates,
  assignedCounties,
  regionLabel,
  defaultCountyScope,
  createdBy,
  onSchedule,
}) => {
  const fieldId = useId();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [frequency, setFrequency] = useState<ReportFrequency>('monthly');
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [sendOnDay, setSendOnDay] = useState(1);
  const [countyScope, setCountyScope] = useState(defaultCountyScope);
  const [recipientsRaw, setRecipientsRaw] = useState(createdBy);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const recipients = parseRecipients(recipientsRaw);
  const invalidRecipients = findInvalidRecipients(recipients);
  const selectedTemplate = templates.find((template) => template.id === templateId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (recipients.length === 0) {
      setSubmitError('Add at least one recipient email address.');
      return;
    }
    if (invalidRecipients.length > 0) {
      setSubmitError(`These do not look like email addresses: ${invalidRecipients.join(', ')}`);
      return;
    }
    if (!selectedTemplate) {
      setSubmitError('Choose a report template.');
      return;
    }

    const now = new Date();
    const report: ScheduledReport = {
      id: `sch_${now.getTime()}`,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      frequency,
      format,
      sendOnDay,
      recipients,
      countyScope,
      isActive: true,
      createdBy,
      createdAt: now.toISOString(),
      nextRunAt: computeNextRun(frequency, sendOnDay, now).toISOString(),
    };

    try {
      setIsSaving(true);
      await onSchedule(report);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-white text-[13px]';
  const labelClass = 'block text-[12px] font-medium text-slate-300 mb-1';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule automated report"
      icon={<CalendarClock className="w-5 h-5 text-emerald-400" aria-hidden="true" />}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={`${fieldId}-template`} className={labelClass}>
            Report template
          </label>
          <select
            id={`${fieldId}-template`}
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            className={inputClass}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id} className="bg-[#1a1d2e]">
                {template.name}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <p className="text-[11px] text-slate-400 mt-1">{selectedTemplate.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${fieldId}-frequency`} className={labelClass}>
              Frequency
            </label>
            <select
              id={`${fieldId}-frequency`}
              value={frequency}
              onChange={(event) => {
                const next = event.target.value as ReportFrequency;
                setFrequency(next);
                // Weekly counts days 0–6; the others count 1–28. Reset so the
                // stored value can never be out of range for the new cadence.
                setSendOnDay(next === 'weekly' ? 1 : 1);
              }}
              className={inputClass}
            >
              {FREQUENCIES.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#1a1d2e]">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${fieldId}-day`} className={labelClass}>
              {frequency === 'weekly' ? 'Send on' : 'Day of period'}
            </label>
            {frequency === 'weekly' ? (
              <select
                id={`${fieldId}-day`}
                value={sendOnDay}
                onChange={(event) => setSendOnDay(Number(event.target.value))}
                className={inputClass}
              >
                {WEEKDAYS.map((day, index) => (
                  <option key={day} value={index} className="bg-[#1a1d2e]">
                    {day}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`${fieldId}-day`}
                type="number"
                min={1}
                max={28}
                value={sendOnDay}
                onChange={(event) => setSendOnDay(Number(event.target.value))}
                className={inputClass}
                // Capped at 28 so a schedule never silently skips February.
                aria-describedby={`${fieldId}-day-hint`}
              />
            )}
            {frequency !== 'weekly' && (
              <p id={`${fieldId}-day-hint`} className="text-[11px] text-slate-400 mt-1">
                1–28, so the send date exists in every month.
              </p>
            )}
          </div>
        </div>

        <div>
          <span className={labelClass}>Format</span>
          <div className="grid grid-cols-2 gap-3">
            {FORMATS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-400 ${
                  format === option.value
                    ? 'bg-emerald-500/15 border-emerald-500/40'
                    : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.16]'
                }`}
              >
                <input
                  type="radio"
                  name="report-format"
                  value={option.value}
                  checked={format === option.value}
                  onChange={() => setFormat(option.value)}
                  className="sr-only"
                />
                <span>
                  <span className="block text-[13px] font-semibold text-white">{option.label}</span>
                  <span className="block text-[11px] text-slate-400">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor={`${fieldId}-scope`} className={labelClass}>
            County scope
          </label>
          <select
            id={`${fieldId}-scope`}
            value={countyScope}
            onChange={(event) => setCountyScope(event.target.value)}
            className={inputClass}
          >
            <option value={ALL_COUNTIES} className="bg-[#1a1d2e]">
              All assigned counties ({regionLabel})
            </option>
            {assignedCounties.map((county) => (
              <option key={county} value={county} className="bg-[#1a1d2e]">
                {county} County
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${fieldId}-recipients`} className={labelClass}>
            Email recipients
          </label>
          <textarea
            id={`${fieldId}-recipients`}
            value={recipientsRaw}
            onChange={(event) => setRecipientsRaw(event.target.value)}
            rows={2}
            className={inputClass}
            placeholder="director@agency.org, grants@unitedway.org"
            aria-describedby={`${fieldId}-recipients-hint`}
          />
          <p id={`${fieldId}-recipients-hint`} className="text-[11px] text-slate-400 mt-1">
            Separate with commas, semicolons or new lines. {recipients.length} recipient
            {recipients.length === 1 ? '' : 's'} so far.
          </p>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Info className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[11px] text-slate-300">
            {describeSchedule(frequency, sendOnDay, recipients.length)}. Delivery runs server-side, so
            it starts once the Cloud Functions scheduler is deployed — the schedule is stored either
            way.
          </p>
        </div>

        {submitError && (
          <p role="alert" className="text-[12px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
            {submitError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-slate-300 hover:text-white rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 text-[13px] font-medium bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            <CalendarClock className="w-4 h-4" aria-hidden="true" />
            {isSaving ? 'Saving…' : 'Schedule report'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
