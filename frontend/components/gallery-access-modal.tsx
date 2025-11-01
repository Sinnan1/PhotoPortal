"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Check, X } from "lucide-react";

interface Client {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface GalleryAccess {
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  createdAt: string;
}

interface GalleryAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  galleryId: string;
  galleryTitle: string;
}

export function GalleryAccessModal({
  open,
  onOpenChange,
  galleryId,
  galleryTitle,
}: GalleryAccessModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [allowedClients, setAllowedClients] = useState<GalleryAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && user?.role === "PHOTOGRAPHER") {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    try {
      const [clientsResponse, allowedClientsResponse] = await Promise.all([
        api.getClients(),
        api.getAllowedClients(galleryId),
      ]);

      setClients(clientsResponse.data.clients);
      setAllowedClients(allowedClientsResponse.data);

      // Initialize selected clients with currently allowed clients
      const allowedClientIds = new Set<string>(
        allowedClientsResponse.data.map((access: GalleryAccess) => access.userId)
      );
      setSelectedClients(allowedClientIds);
    } catch (error) {
      showToast("Failed to load client data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClientToggle = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const handleSaveAccess = async () => {
    setUpdating(true);

    try {
      // Get clients to grant access to (selected but not currently allowed)
      const clientsToGrant = Array.from(selectedClients).filter(
        (clientId) =>
          !allowedClients.some((access) => access.userId === clientId)
      );

      // Get clients to revoke access from (currently allowed but not selected)
      const clientsToRevoke = allowedClients
        .filter((access) => !selectedClients.has(access.userId))
        .map((access) => access.userId);

      // Grant access to new clients
      if (clientsToGrant.length > 0) {
        await api.updateGalleryAccess(galleryId, clientsToGrant, true);
      }

      // Revoke access from removed clients
      if (clientsToRevoke.length > 0) {
        await api.updateGalleryAccess(galleryId, clientsToRevoke, false);
      }

      showToast("Gallery access updated successfully", "success");
      onOpenChange(false);
      fetchData(); // Refresh data
    } catch (error) {
      showToast("Failed to update gallery access", "error");
    } finally {
      setUpdating(false);
    }
  };

  const isClientAllowed = (clientId: string) => {
    return allowedClients.some((access) => access.userId === clientId);
  };

  if (user?.role !== "PHOTOGRAPHER") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Gallery Access
          </DialogTitle>
          <DialogDescription>
            Control which clients can access "{galleryTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">
                    Access Summary
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedClients.size} of {clients.length} clients selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {selectedClients.size} Allowed
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {clients.length - selectedClients.size} Denied
                  </Badge>
                </div>
              </div>

              {/* Clients Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedClients.size === clients.length &&
                            clients.length > 0
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedClients(
                                new Set(clients.map((client) => client.id))
                              );
                            } else {
                              setSelectedClients(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Access</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedClients.has(client.id)}
                            onCheckedChange={() =>
                              handleClientToggle(client.id)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {client.name}
                        </TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              isClientAllowed(client.id)
                                ? "default"
                                : "secondary"
                            }
                          >
                            {isClientAllowed(client.id) ? "Allowed" : "Denied"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(client.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {clients.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">
                    No clients found
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create clients first to manage gallery access.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveAccess}
            disabled={updating || clients.length === 0}
          >
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
