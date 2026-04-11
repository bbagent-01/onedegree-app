import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, Shield, Camera } from "lucide-react";

const tools = [
  {
    title: "House Manual",
    description: "WiFi, keys, appliances, neighborhood tips — everything guests need.",
    href: "/tools/house-manual",
    icon: BookOpen,
  },
  {
    title: "Rental Agreement",
    description: "Generate a simple agreement from your listing details and dates.",
    href: "/tools/rental-agreement",
    icon: FileText,
  },
  {
    title: "Security Deposit",
    description: "Set deposit terms and create an agreement for your guest.",
    href: "/tools/security-deposit",
    icon: Shield,
  },
  {
    title: "Property Photos",
    description: "Document check-in and check-out condition with timestamped photos.",
    href: "/tools/property-photos",
    icon: Camera,
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Host Tools</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Tools to help you manage your listings and stays
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-primary-light p-2">
                    <tool.icon className="size-5 text-primary" />
                  </div>
                  <Badge variant="secondary">V1</Badge>
                </div>
                <CardTitle className="text-sm mt-3">{tool.title}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 pt-0">
                <p className="text-xs text-foreground-secondary leading-relaxed">
                  {tool.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
