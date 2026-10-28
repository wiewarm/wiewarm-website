'use client';

import { useActionState, useEffect, useRef, useState, startTransition, type SyntheticEvent } from 'react';
import Image from 'next/image';
import { CheckCircle2, KeyRound, Loader2, LogIn, LogOut, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { addImage, changePassword, createNews, login, logout, removeImage, removeNews, updateBaseData, updateTemperatures } from '@/app/admin/actions';
import type { ActionState } from '@/app/admin/action-state';
import { passwordStrength } from '@/lib/password-strength';

type Action = (previous: ActionState | null, formData: FormData) => Promise<ActionState>;

// Submitting through startTransition keeps what the user typed when the server rejects the input.
function useAdminAction(action: Action, options: { resetOnSuccess?: boolean; confirm?: string } = {}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && options.resetOnSuccess) formRef.current?.reset();
  }, [state, options.resetOnSuccess]);

  const onSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (options.confirm && !window.confirm(options.confirm)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  return { state, pending, formRef, onSubmit };
}

function Feedback({ state }: { state: ActionState | null }) {
  if (!state?.message) return null;
  const Icon = state.ok ? CheckCircle2 : TriangleAlert;
  return <p className={`admin-feedback ${state.ok ? 'is-ok' : 'is-error'}`} role={state.ok ? 'status' : 'alert'}><Icon aria-hidden="true" />{state.message}</p>;
}

function Field({ label, id, className = '', children }: { label: string; id: string; className?: string; children: React.ReactNode }) {
  return <div className={`admin-field ${className}`.trim()}><label htmlFor={id}>{label}</label>{children}</div>;
}

function Submit({ pending, children, icon }: { pending: boolean; children: React.ReactNode; icon?: React.ReactNode }) {
  return <Button type="submit" className="admin-submit" disabled={pending}>{pending ? <Loader2 className="admin-spin" aria-hidden="true" /> : icon}{children}</Button>;
}

export function LoginForm() {
  const { state, pending, formRef, onSubmit } = useAdminAction(login);
  return <form ref={formRef} onSubmit={onSubmit} className="admin-form login-form">
    <Field label="Bad-Id" id="admin-badid">
      <Input id="admin-badid" name="badid" inputMode="numeric" pattern="[0-9]*" autoComplete="username" placeholder="z.B. 199" required />
    </Field>
    <Field label="PIN" id="admin-pin">
      <Input id="admin-pin" name="pin" type="password" autoComplete="current-password" placeholder="Deine PIN" required />
    </Field>
    <Feedback state={state} />
    <Submit pending={pending} icon={<LogIn aria-hidden="true" />}>Anmelden</Submit>
  </form>;
}

export function LogoutButton() {
  return <form action={logout}><Button type="submit" variant="outline"><LogOut aria-hidden="true" />Abmelden</Button></form>;
}

function StrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);
  if (!strength) return null;
  return <div className={`strength strength-${strength.level}`}>
    <div className="strength-bar" aria-hidden="true">{[0, 1, 2, 3, 4].map((segment) => <span key={segment} className={segment <= strength.level ? 'is-on' : ''} />)}</div>
    <p aria-live="polite"><strong>Passwortstärke: {strength.label}.</strong> {strength.hint}</p>
  </div>;
}

export function ChangePasswordDialog() {
  const { state, pending, formRef, onSubmit } = useAdminAction(changePassword, { resetOnSuccess: true });
  const [newPassword, setNewPassword] = useState('');
  return <Dialog>
    <DialogTrigger render={<Button type="button" variant="outline" />}><KeyRound aria-hidden="true" />Passwort ändern</DialogTrigger>
    <DialogContent className="password-dialog">
      <DialogTitle>Passwort ändern</DialogTitle>
      <DialogDescription>Gib Dein aktuelles Passwort und zweimal das neue Passwort ein.</DialogDescription>
      <form ref={formRef} onSubmit={onSubmit} onReset={() => setNewPassword('')} className="admin-form">
        <Field label="Aktuelles Passwort" id="admin-current-pin"><Input id="admin-current-pin" name="currentPin" type="password" autoComplete="current-password" required /></Field>
        <Field label="Neues Passwort" id="admin-new-pin"><Input id="admin-new-pin" name="newPin" type="password" autoComplete="new-password" maxLength={128} onChange={(event) => setNewPassword(event.target.value)} required /></Field>
        <StrengthMeter password={newPassword} />
        <Field label="Neues Passwort wiederholen" id="admin-confirm-pin"><Input id="admin-confirm-pin" name="confirmPin" type="password" autoComplete="new-password" maxLength={128} required /></Field>
        <Feedback state={state} />
        <Submit pending={pending}>Passwort ändern</Submit>
      </form>
    </DialogContent>
  </Dialog>;
}

export interface BasinFormItem {
  beckenid: string;
  name: string;
  type: string;
  currentTemp: string;
  datePretty: string;
  status: number;
}

export function TemperatureForm({ basins }: { basins: BasinFormItem[] }) {
  const { state, pending, formRef, onSubmit } = useAdminAction(updateTemperatures, { resetOnSuccess: false });
  if (basins.length === 0) return <p className="admin-hint">Für dieses Bad sind keine Becken erfasst.</p>;
  return <form ref={formRef} onSubmit={onSubmit} className="admin-form">
    <div className="admin-basins">{basins.map((basin) => <fieldset key={basin.beckenid} className="admin-basin">
      <legend>{basin.name}{basin.type ? <small>{basin.type}</small> : null}</legend>
      <Field label="Temperatur °C" id={`admin-temp-${basin.beckenid}`}>
        <Input id={`admin-temp-${basin.beckenid}`} name={`temp-${basin.beckenid}`} type="text" inputMode="decimal" pattern="[0-9]{1,2}([.][0-9]+)?" title="Zahl mit Punkt als Dezimaltrennzeichen, z.B. 21.5" autoComplete="off" placeholder={basin.currentTemp ? `aktuell ${basin.currentTemp}` : 'z.B. 21.5'} />
      </Field>
      <Field label="Status" id={`admin-status-${basin.beckenid}`}>
        <select id={`admin-status-${basin.beckenid}`} name={`status-${basin.beckenid}`} defaultValue={basin.status} className="admin-select">
          <option value="1">geöffnet</option>
          <option value="2">gesperrt</option>
          <option value="3">geschlossen</option>
        </select>
      </Field>
      {basin.datePretty ? <p className="admin-hint">Letzte Messung: {basin.datePretty}</p> : null}
    </fieldset>)}</div>
    <p className="admin-hint">Nur ausgefüllte Temperaturen werden gespeichert. Der Status wird immer übernommen.</p>
    <Feedback state={state} />
    <Submit pending={pending}>Speichern</Submit>
  </form>;
}

export function NewsForm() {
  const { state, pending, formRef, onSubmit } = useAdminAction(createNews, { resetOnSuccess: true });
  return <form ref={formRef} onSubmit={onSubmit} className="admin-form">
    <Field label="Neue Kurzmitteilung" id="admin-info-news">
      <Input id="admin-info-news" name="info" maxLength={2000} placeholder="z.B. Heute bis 17 Uhr geöffnet" required />
    </Field>
    <Feedback state={state} />
    <Submit pending={pending}>Speichern</Submit>
  </form>;
}

export function NewsDeleteButton({ infoid }: { infoid: string }) {
  const { state, pending, onSubmit } = useAdminAction(removeNews, { confirm: 'Diesen Eintrag wirklich löschen?' });
  return <form onSubmit={onSubmit} className="admin-inline-form">
    <input type="hidden" name="infoid" value={infoid} />
    <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-label="Eintrag löschen">{pending ? <Loader2 className="admin-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}Löschen</Button>
    {state && !state.ok ? <Feedback state={state} /> : null}
  </form>;
}

export interface BaseDataValues {
  adresse1: string;
  adresse2: string;
  plz: string;
  ort: string;
  telefon: string;
  email: string;
  www: string;
  zeiten: string;
  preise: string;
  info: string;
}

export function BaseDataForm({ values }: { values: BaseDataValues }) {
  const { state, pending, formRef, onSubmit } = useAdminAction(updateBaseData);
  return <form ref={formRef} onSubmit={onSubmit} className="admin-form">
    <div className="admin-grid">
      <Field label="Adresse 1" id="admin-adresse1"><Input id="admin-adresse1" name="adresse1" defaultValue={values.adresse1} required /></Field>
      <Field label="Adresse 2" id="admin-adresse2"><Input id="admin-adresse2" name="adresse2" defaultValue={values.adresse2} /></Field>
      <Field label="PLZ" id="admin-plz"><Input id="admin-plz" name="plz" defaultValue={values.plz} required /></Field>
      <Field label="Ort" id="admin-ort"><Input id="admin-ort" name="ort" defaultValue={values.ort} required /></Field>
      <Field label="Telefon" id="admin-telefon"><Input id="admin-telefon" name="telefon" type="tel" defaultValue={values.telefon} /></Field>
      <Field label="E-Mail" id="admin-email"><Input id="admin-email" name="email" type="email" defaultValue={values.email} placeholder="hans@muster.ch" /></Field>
      <Field label="Website" id="admin-www" className="admin-wide"><Input id="admin-www" name="www" defaultValue={values.www} placeholder="https://www.bad.ch" /></Field>
    </div>
    <Field label="Öffnungszeiten" id="admin-zeiten"><Textarea id="admin-zeiten" name="zeiten" rows={5} defaultValue={values.zeiten} /></Field>
    <Field label="Preise" id="admin-preise"><Textarea id="admin-preise" name="preise" rows={5} defaultValue={values.preise} /></Field>
    <Field label="Weitere Infos" id="admin-info"><Textarea id="admin-info" name="info" rows={5} defaultValue={values.info} /></Field>
    <Feedback state={state} />
    <Submit pending={pending}>Speichern</Submit>
  </form>;
}

export function ImageUploadForm() {
  const { state, pending, formRef, onSubmit } = useAdminAction(addImage, { resetOnSuccess: true });
  return <form ref={formRef} onSubmit={onSubmit} className="admin-form">
    <Field label="Bild" id="admin-image"><Input id="admin-image" name="image" type="file" accept="image/*" required /></Field>
    <Field label="Text (optional)" id="admin-description"><Input id="admin-description" name="description" maxLength={500} placeholder="kurze Beschreibung" /></Field>
    <ul className="admin-hint-list">
      <li>Gängige Formate wie JPEG, PNG oder GIF sind möglich.</li>
      <li>Maximale Grösse ca. 16 MB, bitte verkleinere grössere Bilder vorher.</li>
      <li>Bilder werden automatisch in JPEG umgewandelt und auf maximal 700 Pixel Breite skaliert.</li>
    </ul>
    <Feedback state={state} />
    <Submit pending={pending}>Hochladen</Submit>
  </form>;
}

export function ImageDeleteButton({ imageId }: { imageId: string }) {
  const { state, pending, onSubmit } = useAdminAction(removeImage, { confirm: 'Bild wirklich für immer löschen?' });
  return <form onSubmit={onSubmit} className="admin-inline-form">
    <input type="hidden" name="imageId" value={imageId} />
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>{pending ? <Loader2 className="admin-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}Löschen</Button>
    {state && !state.ok ? <Feedback state={state} /> : null}
  </form>;
}

export function AdminImage({ src, alt }: { src: string; alt: string }) {
  return <Image src={src} alt={alt} width={240} height={160} unoptimized className="admin-thumb" />;
}
