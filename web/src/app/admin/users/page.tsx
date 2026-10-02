"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Button, Card, CardContent, Input, Label, MutedText } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError } from "@/lib/api-client";

const selectClassName =
  "h-11 w-full rounded-md border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: () => apiClient.admin.listUsers() });
  const organizationsQuery = useQuery({ queryKey: ["admin-organizations"], queryFn: () => apiClient.admin.listOrganizations() });
  const users = usersQuery.data ?? [];
  const organizations = organizationsQuery.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [organizationId, setOrganizationId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"OWNER" | "MEMBER">("MEMBER");

  const createMutation = useMutation({
    mutationFn: () => apiClient.admin.createUser(organizationId, { email: email.trim(), password, name: name.trim(), role }),
    onSuccess: () => {
      toast({ variant: "success", title: "User created" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
    },
    onError: (error) => toast({ variant: "error", title: "Couldn't create user", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  return (
    <AdminShell title="Users">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Everyone who can sign in — organization owners and the members they've invited.</p>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Create user"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="org">Organization</Label>
                <select id="org" className={selectClassName} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                  <option value="">Select an organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.businessName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role">Role</Label>
                <select id="role" className={selectClassName} value={role} onChange={(e) => setRole(e.target.value as "OWNER" | "MEMBER")}>
                  <option value="MEMBER">Member</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!organizationId || !name.trim() || !email.trim() || password.length < 8 || createMutation.isPending}
              className="self-start"
            >
              {createMutation.isPending ? "Creating…" : "Create user"}
            </Button>
          </CardContent>
        </Card>
      )}

      {usersQuery.isLoading && <MutedText>Loading…</MutedText>}
      {users.length === 0 && !usersQuery.isLoading && <MutedText>No users yet.</MutedText>}

      <div className="flex flex-col gap-2">
        {users.map((user, i) => (
          <Card key={user.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-in-up">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {user.name}
                  <Badge variant={user.role === "OWNER" ? "default" : "outline"}>{user.role}</Badge>
                  <Badge variant={user.status === "ACTIVE" ? "success" : "danger"}>{user.status}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.email} · {user.organizationName}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{user.lastLoginAt ? `Last seen ${new Date(user.lastLoginAt).toLocaleDateString()}` : "Never signed in"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
