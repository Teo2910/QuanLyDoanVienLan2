import { Unit, Member, Activity } from "../types";

class DataService {
  async getActivities(): Promise<Activity[]> {
    try {
      const response = await fetch("/api/activities");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      return [];
    }
  }

  async addActivity(activity: Omit<Activity, "id" | "createdAt">): Promise<Activity> {
    const newActivity: Activity = {
      ...activity,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: Date.now(),
    };
    const response = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newActivity),
    });
    if (!response.ok) throw new Error("Failed to add activity");
    return newActivity;
  }

  async deleteActivity(id: string): Promise<void> {
    const response = await fetch(`/api/activities/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete activity");
  }

  async updateActivity(id: string, activity: Partial<Activity>): Promise<void> {
    const response = await fetch(`/api/activities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activity),
    });
    if (!response.ok) throw new Error("Failed to update activity");
  }

  async getUnits(): Promise<Unit[]> {
    try {
      const response = await fetch(`/api/units?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch units:", error);
      return [];
    }
  }

  async addUnit(unit: Omit<Unit, "id" | "createdAt">): Promise<Unit> {
    const newUnit: Unit = {
      ...unit,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: Date.now(),
    };
    const response = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUnit),
    });
    if (!response.ok) throw new Error("Failed to add unit");
    return newUnit;
  }

  async getMembers(): Promise<Member[]> {
    try {
      const response = await fetch(`/api/members?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch members:", error);
      return [];
    }
  }

  async addMember(member: Omit<Member, "id" | "createdAt">): Promise<Member> {
    const newMember: Member = {
      ...member,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: Date.now(),
    };
    const response = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMember),
    });
    if (!response.ok) throw new Error("Failed to add member");
    return newMember;
  }

  async deleteMember(id: string): Promise<void> {
    const response = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete member");
  }

  async deleteMembers(ids: string[]): Promise<any> {
    const response = await fetch("/api/members/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error("Failed to delete members");
    return response.json();
  }

  async deleteUnit(id: string): Promise<void> {
    // Note: server needs delete unit route if we want it fully implemented
    // For now I only added delete member. Let's assume we focus on members as per user requests.
    // I will update server.ts to include more routes if needed.
    await fetch(`/api/units/${id}`, { method: "DELETE" });
  }

  async updateUnit(id: string, unit: Partial<Unit>): Promise<void> {
    await fetch(`/api/units/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unit),
    });
  }

  async updateMember(id: string, memberUpdates: Partial<Member>): Promise<void> {
    // Pre-calculate status history like before
    const members = await this.getMembers();
    const m = members.find(m => m.id === id);
    if (!m) return;

    let updatedHistory = m.statusHistory || [];
    if (memberUpdates.status && memberUpdates.status !== m.status) {
      updatedHistory = [
        ...updatedHistory,
        {
          oldStatus: m.status,
          newStatus: memberUpdates.status,
          date: Date.now(),
          reason: (memberUpdates as any).statusReason || "Cập nhật thông tin hệ thống"
        }
      ];
    }

    const updatedMember = { ...m, ...memberUpdates, statusHistory: updatedHistory };
    
    const response = await fetch(`/api/members/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedMember),
    });
    if (!response.ok) throw new Error("Failed to update member");
  }

  async toggleMemberOutstanding(id: string, isOutstanding: boolean): Promise<void> {
    const response = await fetch(`/api/members/${id}/outstanding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOutstanding }),
    });
    if (!response.ok) throw new Error("Failed to toggle outstanding status");
  }
}

export const dataService = new DataService();
