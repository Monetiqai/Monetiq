"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Header from "./Header";

export default function HeaderWrapper() {
    const [isAuthed, setIsAuthed] = useState(false);
    const [userEmail, setUserEmail] = useState<string | undefined>();
    const pathname = usePathname();

    useEffect(() => {
        const supabase = supabaseBrowser();

        // Check initial auth state
        supabase.auth.getUser().then(({ data }) => {
            setIsAuthed(!!data.user);
            setUserEmail(data.user?.email);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setIsAuthed(!!session?.user);
            setUserEmail(session?.user?.email);
        });

        return () => subscription.unsubscribe();
    }, []);

    return <Header isAuthed={isAuthed} userEmail={userEmail} />;
}
