import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  checkAnalyticsSession,
  fetchAnalyticsDashboard,
  getGoogleAuthStartUrl,
  logoutAnalyticsAdmin,
  verifyAdminPin,
  type AdminSessionState,
  type AnalyticsDashboard,
  type AnalyticsRange,
} from "@/services/analyticsAdminService";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value.toLocaleString()}</p>
    </div>
  );
}

function shortenGuestId(guestId: string): string {
  if (guestId.length <= 12) return guestId;
  return `${guestId.slice(0, 8)}…${guestId.slice(-4)}`;
}

function AccessDeniedPanel() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-500">You do not have permission to view this page.</p>
        <a
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Return to ReportReady
        </a>
      </div>
    </div>
  );
}

function LoginPanel({ onAuthenticated }: { onAuthenticated: () => void }) {
  useEffect(() => {
    void (async () => {
      const session = await checkAnalyticsSession();
      if (session.googleAuthenticated) {
        onAuthenticated();
      }
    })();
  }, [onAuthenticated]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">ReportReady Analytics</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in with Google to continue.</p>

        <Button
          type="button"
          className="mt-6 w-full"
          onClick={() => {
            window.location.href = getGoogleAuthStartUrl();
          }}
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}

function PinPanel({ onVerified }: { onVerified: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyAdminPin(pin);
      onVerified();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Invalid code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Enter admin verification code</h1>
        <p className="mt-2 text-sm text-slate-500">Second step required after Google sign-in.</p>

        <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="admin-pin">
          Verification code
        </label>
        <input
          id="admin-pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2"
        />

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <Button type="submit" className="mt-6 w-full" disabled={isSubmitting || !pin}>
          {isSubmitting ? "Verifying…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}

function DashboardPanel({
  dashboard,
  range,
  adminEmail,
  onRangeChange,
  onLogout,
  isLoading,
}: {
  dashboard: AnalyticsDashboard;
  range: AnalyticsRange;
  adminEmail?: string;
  onRangeChange: (range: AnalyticsRange) => void;
  onLogout: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">ReportReady Analytics</h1>
            <p className="text-sm text-slate-500">
              Anonymous usage only. No PHI collected.
              {adminEmail ? ` Signed in as ${adminEmail}.` : null}
            </p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onRangeChange(option.value)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                range === option.value
                  ? "bg-teal-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {option.label}
            </button>
          ))}
          {isLoading ? <span className="self-center text-sm text-slate-400">Refreshing…</span> : null}
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard label="Total visits" value={dashboard.cards.totalVisits} />
          <StatCard label="Unique guests" value={dashboard.cards.uniqueGuests} />
          <StatCard label="Visits today" value={dashboard.cards.visitsToday} />
          <StatCard label="Template views" value={dashboard.cards.templateViews} />
          <StatCard label="Print clicks" value={dashboard.cards.printClicks} />
          <StatCard label="Feedback opens" value={dashboard.cards.feedbackOpens} />
          <StatCard label="Feedback submissions" value={dashboard.cards.feedbackSubmissions} />
          <StatCard label="Buy Me a Coffee clicks" value={dashboard.cards.buyMeCoffeeClicks} />
          <StatCard label="Credanta clicks" value={dashboard.cards.credantaClicks} />
          <StatCard label="Coming Soon clicks" value={dashboard.cards.comingSoonClicks} />
          <StatCard label="Breakroom visits" value={dashboard.cards.breakroomVisits} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Top templates viewed</h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-2 font-medium">Template</th>
                  <th className="pb-2 font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.topTemplatesViewed.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-4 text-slate-400">
                      No data yet.
                    </td>
                  </tr>
                ) : (
                  dashboard.topTemplatesViewed.map((row) => (
                    <tr key={row.templateId} className="border-t border-slate-100">
                      <td className="py-2 font-mono text-xs text-slate-700">{row.templateId}</td>
                      <td className="py-2 text-slate-900">{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Top printed templates</h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-2 font-medium">Template</th>
                  <th className="pb-2 font-medium">Prints</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.topPrintedTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-4 text-slate-400">
                      No data yet.
                    </td>
                  </tr>
                ) : (
                  dashboard.topPrintedTemplates.map((row) => (
                    <tr key={row.templateId} className="border-t border-slate-100">
                      <td className="py-2 font-mono text-xs text-slate-700">{row.templateId}</td>
                      <td className="py-2 text-slate-900">{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Guest visitors</h2>
            <p className="mt-1 text-sm text-slate-500">
              One row per anonymous guest ID (browser localStorage). No login or IP stored.
            </p>
            <div className="mt-4 max-h-[32rem] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-slate-500">
                    <th className="pb-2 pr-3 font-medium">Guest ID</th>
                    <th className="pb-2 pr-3 font-medium">First seen</th>
                    <th className="pb-2 pr-3 font-medium">Last seen</th>
                    <th className="pb-2 pr-3 font-medium">Visits</th>
                    <th className="pb-2 pr-3 font-medium">Device</th>
                    <th className="pb-2 pr-3 font-medium">Browser</th>
                    <th className="pb-2 font-medium">Recent paths</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.guestVisitors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-slate-400">
                        No guest visitors yet.
                      </td>
                    </tr>
                  ) : (
                    dashboard.guestVisitors.map((guest) => (
                      <tr key={guest.guestId} className="border-t border-slate-100 align-top">
                        <td
                          className="py-2 pr-3 font-mono text-xs text-slate-700"
                          title={guest.guestId}
                        >
                          {shortenGuestId(guest.guestId)}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-xs text-slate-500">
                          {new Date(guest.firstSeen).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-xs text-slate-500">
                          {new Date(guest.lastSeen).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-slate-900">{guest.visitCount}</td>
                        <td className="py-2 pr-3 capitalize text-slate-700">{guest.deviceType}</td>
                        <td className="py-2 pr-3 capitalize text-slate-700">{guest.browserFamily}</td>
                        <td className="py-2 font-mono text-xs text-slate-600">
                          {guest.recentPaths.length === 0 ? (
                            "—"
                          ) : (
                            <ul className="space-y-1">
                              {guest.recentPaths.map((path) => (
                                <li key={path}>{path}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Traffic by page</h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-2 font-medium">Path</th>
                  <th className="pb-2 font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.trafficByPage.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-4 text-slate-400">
                      No data yet.
                    </td>
                  </tr>
                ) : (
                  dashboard.trafficByPage.map((row) => (
                    <tr key={row.path} className="border-t border-slate-100">
                      <td className="py-2 font-mono text-xs text-slate-700">{row.path}</td>
                      <td className="py-2 text-slate-900">{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Recent events</h2>
            <div className="mt-4 max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Event</th>
                    <th className="pb-2 font-medium">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentEvents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-slate-400">
                        No events yet.
                      </td>
                    </tr>
                  ) : (
                    dashboard.recentEvents.map((event) => (
                      <tr key={event.id} className="border-t border-slate-100">
                        <td className="py-2 text-xs text-slate-500">
                          {new Date(event.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 text-slate-900">{event.eventName}</td>
                        <td className="py-2 font-mono text-xs text-slate-600">{event.path || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AnalyticsAdmin() {
  const [session, setSession] = useState<AdminSessionState | null>(null);
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshSession = useCallback(async () => {
    const next = await checkAnalyticsSession();
    setSession(next);
    return next;
  }, []);

  const loadDashboard = useCallback(async (nextRange: AnalyticsRange) => {
    setIsLoading(true);
    try {
      const data = await fetchAnalyticsDashboard(nextRange);
      setDashboard(data);
    } catch {
      setDashboard(null);
      await refreshSession();
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!session?.adminVerified) return;
    void loadDashboard(range);
  }, [session?.adminVerified, range, loadDashboard]);

  if (session === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (session.accessDenied) {
    return <AccessDeniedPanel />;
  }

  if (!session.googleAuthenticated) {
    return <LoginPanel onAuthenticated={() => void refreshSession()} />;
  }

  if (!session.adminVerified) {
    return <PinPanel onVerified={() => void refreshSession()} />;
  }

  if (!dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading dashboard…
      </div>
    );
  }

  return (
    <DashboardPanel
      dashboard={dashboard}
      range={range}
      adminEmail={session.email}
      onRangeChange={(nextRange) => {
        setRange(nextRange);
        void loadDashboard(nextRange);
      }}
      onLogout={() => {
        void (async () => {
          await logoutAnalyticsAdmin();
          setSession({
            googleAuthenticated: false,
            adminVerified: false,
            accessDenied: false,
          });
          setDashboard(null);
        })();
      }}
      isLoading={isLoading}
    />
  );
}
