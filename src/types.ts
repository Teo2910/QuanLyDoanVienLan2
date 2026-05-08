export type UserRole = "admin" | "secretary";

export interface SystemLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: number;
}

export interface SearchPreset {
  id: string;
  name: string;
  filters: {
    unit: string;
    status: string;
    academicYear: string;
    achievement: string;
    searchTerm: string;
    hometown: string;
    gender?: string;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  isSecretary?: boolean;
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  unitId?: string;
  presets?: SearchPreset[];
}

export interface Unit {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: number;
}

export interface StatusChange {
  oldStatus: string;
  newStatus: string;
  date: number;
  reason?: string;
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  location: string;
  description?: string;
  type: string;
  createdAt: number;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  updatedAt: number;
}

export interface Member {
  id: string;
  fullName: string;
  memberId: string;
  dob: string;
  gender: "Nam" | "Nữ" | "Khác";
  ethnic?: string;
  religion?: string;
  placeOfBirth?: string;
  hometown?: string;
  permanentAddress?: string;
  joinDate?: string;
  unitId: string;
  email?: string;
  phone?: string;
  academicYear?: string;
  professionalLevel?: string;
  position?: string;
  achievementLevel?: "Xuất sắc" | "Khá" | "Trung bình" | "Chưa xếp loại";
  status: "Đang sinh hoạt" | "Đã chuyển sinh hoạt" | "Đã trưởng thành" | "Bị kỷ luật";
  statusHistory?: StatusChange[];
  isOutstanding?: boolean;
  createdAt: number;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
}

export interface Movement {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
  attachments: Attachment[];
  participatingUnitIds: string[];
  creatorId: string;
  createdAt: number;
}

export interface MovementReport {
  id: string;
  movementId: string;
  unitId: string;
  description: string;
  attachments: Attachment[];
  submittedAt: number;
  submissionCount?: number;
}
