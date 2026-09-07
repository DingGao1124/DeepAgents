import { useMemo, useState } from "react";
import { CheckIcon, ShieldAlertIcon, XIcon } from "lucide-react";
import type { HITLRequest, Decision } from "../config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  request: HITLRequest;
  disabled: boolean;
  onResume: (decisions: Decision[]) => void;
}

export function ApprovalCard({ request, disabled, onResume }: Props) {
  const { actionRequests, reviewConfigs } = request;
  const [argsText, setArgsText] = useState(() =>
    actionRequests.map((action) => JSON.stringify(action.args, null, 2)),
  );
  const [rejectMessages, setRejectMessages] = useState(() =>
    actionRequests.map(() => ""),
  );
  const [error, setError] = useState<string | null>(null);

  const originals = useMemo(
    () => actionRequests.map((action) => JSON.stringify(action.args, null, 2)),
    [actionRequests],
  );

  const allowed = (index: number) =>
    reviewConfigs[index]?.allowedDecisions ??
    reviewConfigs[0]?.allowedDecisions ?? ["approve", "reject"];

  const setArgs = (index: number, value: string) =>
    setArgsText((current) =>
      current.map((text, itemIndex) => (itemIndex === index ? value : text)),
    );

  const setRejectMessage = (index: number, value: string) =>
    setRejectMessages((current) =>
      current.map((text, itemIndex) => (itemIndex === index ? value : text)),
    );

  const approve = () => {
    setError(null);
    const decisions: Decision[] = [];
    for (let index = 0; index < actionRequests.length; index += 1) {
      const changed = argsText[index].trim() !== originals[index].trim();
      if (changed && allowed(index).includes("edit")) {
        try {
          decisions.push({
            type: "edit",
            editedAction: {
              name: actionRequests[index].name,
              args: JSON.parse(argsText[index]) as Record<string, unknown>,
            },
          });
        } catch {
          setError(`Arguments for action ${index + 1} (${actionRequests[index].name}) are not valid JSON.`);
          return;
        }
      } else {
        decisions.push({ type: "approve" });
      }
    }
    onResume(decisions);
  };

  const reject = () => {
    setError(null);
    onResume(
      actionRequests.map((action, index) => ({
        type: "reject",
        message: rejectMessages[index] || `User rejected ${action.name}. Do not retry.`,
      })),
    );
  };

  return (
    <Alert>
      <ShieldAlertIcon />
      <AlertTitle>Approval required</AlertTitle>
      <AlertDescription>
        The agent is ready to perform {actionRequests.length} sensitive action(s). Review the
        arguments, then approve or reject them.
      </AlertDescription>

      <div className="col-span-full mt-4">
        <FieldGroup>
          {actionRequests.map((action, index) => (
            <FieldSet key={`${action.name}-${index}`}>
              <FieldLegend className="flex items-center gap-2">
                {action.name}
                {allowed(index).map((decision) => (
                  <Badge key={decision} variant="outline">
                    {decision}
                  </Badge>
                ))}
              </FieldLegend>

              {action.description && (
                <FieldDescription>{action.description}</FieldDescription>
              )}

              <FieldGroup>
                <Field data-invalid={!!error && error.includes(`action ${index + 1}`)}>
                  <FieldLabel htmlFor={`approval-args-${index}`}>
                    Arguments {allowed(index).includes("edit") ? "(editable JSON)" : "(read-only)"}
                  </FieldLabel>
                  <Textarea
                    id={`approval-args-${index}`}
                    value={argsText[index]}
                    readOnly={disabled || !allowed(index).includes("edit")}
                    aria-invalid={!!error && error.includes(`action ${index + 1}`)}
                    spellCheck={false}
                    rows={Math.min(10, argsText[index].split("\n").length + 1)}
                    onChange={(event) => setArgs(index, event.target.value)}
                  />
                  {!!error && error.includes(`action ${index + 1}`) && (
                    <FieldError>{error}</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor={`approval-reject-${index}`}>Reason for rejection</FieldLabel>
                  <Input
                    id={`approval-reject-${index}`}
                    placeholder="Optional feedback sent to the agent"
                    value={rejectMessages[index]}
                    disabled={disabled}
                    onChange={(event) => setRejectMessage(index, event.target.value)}
                  />
                </Field>
              </FieldGroup>

              {index < actionRequests.length - 1 && <FieldSeparator />}
            </FieldSet>
          ))}
        </FieldGroup>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={disabled} onClick={approve}>
            <CheckIcon data-icon="inline-start" />
            Approve all
          </Button>
          <Button variant="destructive" disabled={disabled} onClick={reject}>
            <XIcon data-icon="inline-start" />
            Reject all
          </Button>
        </div>
      </div>
    </Alert>
  );
}
