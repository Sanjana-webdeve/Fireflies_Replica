"use client";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import NewMeetingModal from "./NewMeetingModal";
import CommandPalette from "./CommandPalette";

interface UI { openNewMeeting: () => void; openSearch: () => void }
const UICtx = createContext<UI>({ openNewMeeting: () => {}, openSearch: () => {} });
export const useUI = () => useContext(UICtx);

export default function AppShell({ children }: { children: ReactNode }) {
  const [newOpen, setNewOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <UICtx.Provider value={{ openNewMeeting: () => setNewOpen(true), openSearch: () => setSearchOpen(true) }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <NewMeetingModal open={newOpen} onClose={() => setNewOpen(false)} />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </UICtx.Provider>
  );
}