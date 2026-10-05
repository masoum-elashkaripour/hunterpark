"use client";

import { useState } from "react";
import { CONTACT } from "@/lib/contact";

/**
 * The brief — five questions, which is the promise the card above makes.
 *
 * It was three fields. The reference offers "cinq questions, deux minutes" and
 * is right that the number is part of the offer: an open textarea asks the
 * reader to work out what matters, and five named questions tell them. These
 * five are the ones a production actually turns on — who, where to reply, what
 * it is, when it has to exist, and what it can cost.
 *
 * FRONT-END ONLY, and it says so rather than pretending. There is no database,
 * no API route and no mail transport in this project, so a form that POSTed
 * would drop what people write on the floor. This hands the message to the
 * reader's own mail client instead, which actually sends.
 *
 * The address lives in `lib/contact.ts` and is empty until the real one is
 * known — see the note there. With it empty the button stays, but it says what
 * it will do, and the status line says the recipient still has to be filled in.
 * A visible gap is recoverable; a message sent nowhere is not.
 */

type State = "idle" | "sent";

/** The five, in the order a brief is actually read. */
const FIELDS = [
  { name: "name", label: "Who you are", type: "text", autoComplete: "name" },
  {
    name: "email",
    label: "Where we reply",
    type: "email",
    autoComplete: "email",
  },
  { name: "project", label: "What you want to make", type: "textarea" },
  { name: "when", label: "When it has to exist", type: "text" },
  { name: "budget", label: "What it can cost", type: "text", optional: true },
] as const;

export function ContactForm({
  /**
   * Rendered inside another section rather than owning one.
   *
   * `ContactReveal` puts the form in its own grid over the picture, where this
   * component's section wrapper, gutter padding and standfirst would all fight
   * the layout around it. The FORM is identical either way — same fields, same
   * submit, same status line — which is why this is a flag and not a second
   * component.
   */
  bare = false,
}: { bare?: boolean } = {}) {
  const [state, setState] = useState<State>("idle");
  const hasMail = CONTACT.email.length > 0;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();

    const body = [
      `What they want to make:\n${get("project")}`,
      `When: ${get("when") || "—"}`,
      `Budget: ${get("budget") || "—"}`,
      `\n—\n${get("name")}\n${get("email")}`,
    ].join("\n\n");

    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
      `New project — ${get("name") || "Hunterpark"}`,
    )}&body=${encodeURIComponent(body)}`;

    setState("sent");
  };

  const form = (
    <form className="contact-form" onSubmit={submit}>
      {FIELDS.map((field) => (
        <label key={field.name} className="contact-field">
          <span className="label-xs contact-field__label">
            {field.label}
            {"optional" in field && field.optional ? (
              <span className="contact-field__opt"> — optional</span>
            ) : null}
          </span>
          {field.type === "textarea" ? (
            <textarea name={field.name} rows={4} required />
          ) : (
            <input
              name={field.name}
              type={field.type}
              autoComplete={
                "autoComplete" in field ? field.autoComplete : undefined
              }
              required={!("optional" in field && field.optional)}
            />
          )}
        </label>
      ))}

      <button className="contact-action contact-submit" type="submit">
        <span>Send it</span>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path
            d="M3 13 13 3M6 3h7v7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      </button>

      {/* Polite, not assertive — it follows the reader's own action, so it
              has no business interrupting what they do next. */}
      <p className="hp-copy contact-form__status" role="status">
        {state === "sent"
          ? hasMail
            ? "Your mail client should be opening, with the brief ready to send."
            : "Your mail client is opening — add our address in the To field and it will send."
          : "This opens your own mail client with the brief composed."}
      </p>
    </form>
  );

  if (bare) return form;

  return (
    <section className="contact-section contact-form-section" id="contact-form">
      <div className="contact-form-section__inner">
        <div className="contact-form-section__lede">
          <h2 className="hp-display contact-form-section__head">
            Send a brief.
          </h2>
          <p className="hp-copy contact-form-section__note">
            Five questions. None of them are a test — a sentence each is plenty,
            and the last one can stay empty.
          </p>
        </div>
        {form}
      </div>
    </section>
  );
}
