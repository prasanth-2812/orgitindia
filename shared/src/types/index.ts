// User Types
export interface User {
  id: string;
  mobile: string;
  name: string;
  role: 'admin' | 'employee' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended';
  profilePhotoUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  department?: string;
  designation?: string;
  reportingTo?: string;
  permissions: Record<string, any>;
}

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  email?: string;
  mobile?: string;
  gst?: string;
  pan?: string;
  cin?: string;
  accountingYearStart?: string;
}

// Authentication Types
export interface AuthRequest {
  mobile: string;
}

export interface OTPVerificationRequest {
  mobile: string;
  otpCode: string;
}

export interface ProfileSetupRequest {
  name: string;
  profilePhotoUrl?: string;
  bio?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// Session Types
export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  deviceType: 'mobile' | 'web';
  token: string;
  expiresAt: string;
}

// Contact Types
export interface Contact {
  id: string;
  userId: string;
  name: string;
  mobile: string;
  isRegistered: boolean;
  registeredUserId?: string;
  syncedAt: string;
}

export interface ContactSyncRequest {
  contacts: Array<{
    name: string;
    mobile: string;
  }>;
}

// Message Types
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'voice_note';
export type MessageVisibilityMode = 'org_only' | 'shared_to_group';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  messageType: MessageType;
  content?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  visibilityMode: MessageVisibilityMode;
  senderOrganizationId: string;
  replyToMessageId?: string;
  forwardedFromMessageId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  deletedForEveryone: boolean;
  isPinned: boolean;
  isStarred: boolean;
  mentions: string[];
  taskMentions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageStatusRecord {
  id: string;
  messageId: string;
  userId: string;
  status: MessageStatus;
  statusAt: string;
}

// Group Types
export interface Group {
  id: string;
  name?: string;
  photoUrl?: string;
  createdBy: string;
  isTaskGroup: boolean;
  taskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  organizationId: string;
  role: 'admin' | 'member';
  addedBy: string;
  addedAt: string;
}

// Task Types
export type TaskType = 'one_time' | 'recurring';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'rejected' | 'overdue';
export type TaskCategory = 'general' | 'document_management' | 'compliance_management';
export type TaskFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'specific_weekday';

export interface Task {
  id: string;
  title: string;
  description?: string;
  taskType: TaskType;
  creatorId: string;
  organizationId: string;
  startDate?: string;
  targetDate?: string;
  dueDate?: string;
  frequency?: TaskFrequency;
  specificWeekday?: number;
  nextRecurrenceDate?: string;
  category?: TaskCategory;
  status: TaskStatus;
  escalationStatus: 'none' | 'escalated' | 'resolved';
  complianceId?: string;
  compliances?: ComplianceMaster[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  assignedToUserId: string;
  assignedByUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed';
  rejectionReason?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification Types
export type NotificationType = 
  | 'task_assigned' 
  | 'task_accepted' 
  | 'task_rejected' 
  | 'task_updated' 
  | 'task_overdue' 
  | 'task_escalated' 
  | 'message_received' 
  | 'group_member_added' 
  | 'document_shared';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: NotificationType;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// Compliance Types
export interface ComplianceMaster {
  id: string;
  title: string;
  category: string;
  actName?: string;
  description?: string;
  complianceType: 'ONE_TIME' | 'RECURRING';
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  effectiveDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
  scope: 'GLOBAL' | 'ORG';
  organizationId?: string;
  version: string;
  createdBy: string;
  createdByRole: 'SUPER_ADMIN' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceDocument {
  id: string;
  complianceId: string;
  fileUrl: string;
  fileType: 'PDF' | 'DOC' | 'DOCX';
  fileName?: string;
  fileSize?: number;
  uploadedBy: string;
  uploadedAt: string;
  isDeleted: boolean;
}

// Document Management Types
export type DocumentScope = 'GLOBAL' | 'ORG';
export type DocumentStatus = 'ACTIVE' | 'INACTIVE';

export interface Document {
  id: string;
  title: string;
  category?: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  status: DocumentStatus;
  scope: DocumentScope;
  organizationId?: string;
  createdBy: string;
  createdByRole: 'SUPER_ADMIN' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  fileUrl: string;
  version: string;
  uploadedAt: string;
  uploadedBy: string;
}

// Legacy ComplianceItem type (for backward compatibility during migration)
export interface ComplianceItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  applicableActs: string[];
  requirements: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Platform Settings Types
export interface PlatformSettings {
  autoEscalation: {
    enabled: boolean;
    unacceptedHours: number;
    overdueDays: number;
    missedRecurrenceEnabled: boolean;
  };
  reminder: {
    dueSoonDays: number;
    pushEnabled: boolean;
    emailEnabled: boolean;
    reminderIntervals: number[]; // hours before due date
  };
  recurringTasks: {
    defaultFrequencies: string[];
    autoCalculateDueDate: boolean;
    escalationEnabled: boolean;
  };
  system: {
    maintenanceMode: boolean;
    features: Record<string, boolean>;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

