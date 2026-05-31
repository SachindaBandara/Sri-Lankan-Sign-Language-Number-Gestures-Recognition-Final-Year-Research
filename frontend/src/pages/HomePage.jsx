import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useTranslation } from "../i18n";

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <section className="space-y-4">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>{t("home.welcome")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-600">
          <p>{t("home.p1")}</p>
          <p>{t("home.p2")}</p>
        </CardContent>
      </Card>
    </section>
  );
}
