import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function HomePage() {
  return (
    <section className="space-y-4">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-600">
          <p>Use this app to recognize Sri Lankan Sign Language numbers from 0 to 50 in real-time.</p>
          <p>Then practice addition, subtraction, multiplication, and division using sign-based answers.</p>
        </CardContent>
      </Card>
    </section>
  );
}
