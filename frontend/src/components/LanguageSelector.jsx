import { useTranslation } from "../i18n";

export default function LanguageSelector({ className = "" }) {
  const { lang, setLang } = useTranslation();

  return (
    <div className={className}>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="rounded-md border bg-white px-2 py-1 text-sm"
      >
        <option value="en">English</option>
        <option value="si">සිංහල</option>
      </select>
    </div>
  );
}
