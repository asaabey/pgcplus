"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { ReactNode } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";

interface AppHeaderProps {
    action?: ReactNode;
}

export function AppHeader({ action }: AppHeaderProps) {
    return (
        <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-3 text-foreground">
                        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                            <FileText className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                            <p className="text-base font-semibold text-muted-foreground">Policy &amp; Guideline Center</p>
                            <p className="text-sm text-foreground">Powered with AI</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2">
                        {action}
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </header>
    );
}
