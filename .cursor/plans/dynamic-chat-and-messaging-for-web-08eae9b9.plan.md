<!-- 08eae9b9-bf9e-4eba-8079-44ddd2e73172 b22b5140-ebff-44de-867e-24402dfabc96 -->
# Replicate Mobile Message and Task Modules for Web

## Overview

Replicate the mobile app's message and task modules exactly for the web platform. This includes all features, UI components, real-time updates, and user interactions from the mobile app, using the existing backend API without modifying the mobile app or breaking existing web functionality.

## Current State Analysis

### Message Module

**Mobile Implementation:**

- `ChatScreen.js` - Full-featured chat with reactions, replies, editing, deleting, forwarding, starring, typing indicators, online status, media messages (image/video/document/location/voice), message status (sent/delivered/read), date separators, reply previews, emoji picker, action sheet
- `ConversationsScreen.js` - Conversation list with filters (All/Unread/Favorites/Groups), search, real-time updates, pinned conversations, unread counts, last message preview
- `NewChatScreen.js` - User search and conversation creation

**Web Current State:**

- `DirectChatConversation.tsx` - Basic implementation, missing many features
- `MainMessagingScreen.tsx` - Basic conversation list, missing filters and some features
- `TaskGroupChatConversation.tsx` - Basic group chat
- Missing: Full message features (reactions, replies, editing, forwarding, starring), typing indicators, online status, media message handling, proper action menus

### Task Module

**Mobile Implementation:**

- `TaskDashboardScreen.js` - Task dashboard with tabs (one_time/recurring), task creation modal, pending review section, all tasks section, search, accept/reject buttons on cards, priority badges, status badges, acceptance status indicators
- `TaskDetailScreen.js` - Full task details with accept/reject functionality, task info cards, assignees display, acceptance status, activity log, escalation rules, date cards (start/target/due), reject modal
- `TaskCreateScreen.js` - Complete task creation form with task type selection, priority, assignees, dates (start/target/due), recurrence settings, auto-escalate toggle, custom date picker

**Web Current State:**

- `TaskListManagement.tsx` - Basic task list, missing mobile features
- `TaskDetailsScreen.tsx` - Basic details, missing accept/reject and full mobile UI
- `TaskCreationScreen.tsx` - Incomplete form, missing mobile features
- Missing: Task creation modal, pending review section, accept/reject on cards, full task detail UI, proper date pickers

## Implementation Plan

### Phase 1: Message Module - ChatScreen Features

#### 1.1 Enhance DirectChatConversation Component

**File:** `web/src/screens/messaging/DirectChatConversation.tsx`

**Features to Add:**

- Message reactions (add/remove reactions, display reaction emojis)
- Reply functionality (reply bar, reply preview in messages)
- Message editing (edit bar, edit existing messages)
- Message deletion (delete for me, delete for everyone with confirmation)
- Message forwarding (forward to other conversations)
- Message starring (star/unstar messages)
- Typing indicators (show "typing..." with animated dots)
- Online/offline status (green dot for online, "offline" text)
- Media message support (image, video, document, location, voice note with proper rendering)
- Message status indicators (✓ sent, ✓✓ delivered, ✓✓ blue read)
- Date separators (show "Today", "Yesterday", or date between messages)
- Reply preview in message bubbles
- Long-press context menu (action sheet with all message options)
- Emoji picker modal for reactions
- Message copy functionality
- Proper message normalization (handle both snake_case and camelCase from backend)
- Optimistic updates for better UX
- Message pagination (load older messages on scroll up)

**Implementation Details:**

- Add state for `replyingTo`, `editingMessage`, `selectedMessage`, `showEmojiPicker`, `isTyping`, `isOnline`
- Implement socket listeners for `typing`, `user_online`, `user_offline`, `user_online_status`
- Add message action handlers: `handleReaction`, `handleReply`, `handleEdit`, `handleDelete`, `handleForward`, `handleStar`, `handleCopy`
- Create message rendering with all message types (text, image, video, document, location, voice)
- Add date separator logic
- Implement typing indicator with debouncing
- Add online status checking and display
- Create action sheet modal for message options
- Create emoji picker modal
- Add reply bar and edit bar UI components

#### 1.2 Enhance ConversationsScreen Component

**File:** `web/src/screens/messaging/MainMessagingScreen.tsx`

**Features to Add:**

- Filter tabs (All, Direct, Task Groups) - already partially implemented, enhance
- Search functionality - already implemented, verify
- Pinned conversations (show pinned first with pin icon)
- Unread count badges
- Last message preview with sender name for groups
- Real-time conversation updates via socket
- Conversation pinning (long-press or menu to pin/unpin)
- Proper conversation sorting (pinned first, then by last message time)
- Empty states
- Pull-to-refresh (or refresh button)

**Implementation Details:**

- Enhance filter tabs to match mobile (All, Direct, Task Groups)
- Add pin/unpin functionality using `conversationService.pinConversation`
- Improve conversation list rendering with all mobile features
- Add socket listeners for real-time updates
- Enhance search to match mobile behavior

#### 1.3 Message Service Enhancements

**File:** `web/src/services/messageService.ts`

**Already Implemented:**

- `getMessagesByConversationId` ✓
- `markMessagesAsReadByConversationId` ✓
- `addReaction`, `removeReaction` ✓
- `forwardMessage` ✓

**Verify/Add:**

- Ensure all methods match mobile service exactly
- Add proper error handling
- Verify response format handling

### Phase 2: Task Module - TaskDashboardScreen

#### 2.1 Create/Enhance TaskDashboardScreen Component

**File:** `web/src/screens/tasks/TaskDashboardScreen.tsx` (new or enhance existing)

**Features to Implement:**

- Header with profile icon, "My Tasks" title, filter icon, create task button
- Tab container (One-Time / Recurring tabs)
- Search bar with search icon
- Task creation modal (full-screen or overlay modal)
- Pending Review section (tasks with status='pending')
- All Tasks section (tasks with other statuses)
- Task cards with:
- Status badge (Pending badge for pending tasks)
- Priority badge (High/Medium priority indicators)
- Task title
- Due date with calendar icon
- Description (2 lines max)
- Acceptance status (for pending tasks with multiple assignees: "X of Y accepted")
- User acceptance indicator ("You accepted" badge)
- Accept/Reject buttons (for pending tasks where user is assigned)
- Overdue badge (for overdue tasks)
- Empty state with "Create Task" button
- Pull-to-refresh or refresh functionality
- Task filtering by search query
- Task creation modal with all fields (matching mobile exactly)

**Implementation Details:**

- Use `taskService.getTasks({ type: 'one_time' | 'recurring' })`
- Filter tasks into `pendingTasks` and `allTasks`
- Implement task creation modal matching mobile `TaskDashboardScreen.js` modal
- Add accept/reject handlers that navigate to TaskDetailScreen
- Implement proper date formatting matching mobile
- Add priority and status color coding
- Implement acceptance status calculation and display

#### 2.2 Task Creation Modal Component

**File:** `web/src/components/tasks/TaskCreateModal.tsx` (new)

**Features to Implement:**

- Task type selection (One-Time / Recurring radio buttons)
- Title input (required)
- Description textarea
- Priority selection (Low / Medium / High)
- Assignees selection (multi-select with user list, show selected count)
- Start date picker (custom date/time picker matching mobile)
- Target date picker
- Due date picker (required)
- Recurrence type (if recurring: daily/weekly/monthly)
- Auto-escalate toggle
- Create button (disabled until required fields filled)
- Cancel button
- Custom date picker component (matching mobile's scrollable date picker)

**Implementation Details:**

- Create modal component that can be used in TaskDashboardScreen
- Implement custom date picker with year/month/day/hour/minute selectors (matching mobile)
- Use `conversationService.getAllUsers()` for assignee selection
- Use `taskService.createTask()` for submission
- Match mobile form validation exactly

### Phase 3: Task Module - TaskDetailScreen

#### 3.1 Enhance TaskDetailScreen Component

**File:** `web/src/screens/tasks/TaskDetailsScreen.tsx`

**Features to Add:**

- Header with back button, "Task Details" title, more options icon
- Task Info Card:
- Status badge (Pending Approval badge)
- Priority badge (High Priority badge)
- Task title
- Meta information (Created date, Task ID)
- Description Card (if description exists)
- Date Cards Row:
- Start Date card (with play icon)
- Target Date card (with flag icon)
- Due Date card (highlighted, with calendar icon, overdue badge if overdue)
- Assigned To Card:
- Assignee avatars (overlapping, max 3 visible, "+X more" indicator)
- Assignee names
- Acceptance status ("X of Y accepted")
- "You accepted" badge (if user accepted)
- Auto Escalation Rules card (if auto_escalate is true)
- Activity Log card (recent activities)
- Action Bar (bottom):
- Reject button (if can reject)
- Accept Task button (if can accept)
- Reject Modal:
- Title: "Reject Task"
- Subtitle: "Please provide a reason for rejection"
- Reason textarea (required)
- Cancel button
- Reject button (disabled if reason empty)
- Navigation to task chat (if conversation_id exists) after accepting

**Implementation Details:**

- Use `taskService.getTask(taskId)` to fetch task
- Calculate `canAccept` and `canReject` based on task status, user assignment, and acceptance status
- Implement accept handler: `taskService.acceptTask(taskId)` then navigate to task chat if conversation_id exists
- Implement reject handler: `taskService.rejectTask(taskId, reason)` with modal
- Format dates matching mobile format
- Display assignees with avatars and acceptance indicators
- Show activity log if available
- Match mobile UI layout exactly

#### 3.2 Task Service Verification

**File:** `web/src/services/taskService.ts`

**Verify Methods Match Mobile:**

- `getTasks(filters)` - verify filter parameter names match (mobile uses `type`, not `taskType`)
- `getTask(taskId)` - verify response format
- `createTask(taskData)` - verify all fields match mobile format
- `acceptTask(taskId)` - verify endpoint
- `rejectTask(taskId, reason)` - verify parameter name (mobile uses `reason`, not `rejectionReason`)
- `updateTaskStatus(taskId, status)` - verify if needed

### Phase 4: Task Module - TaskCreateScreen

#### 4.1 Enhance TaskCreationScreen Component

**File:** `web/src/screens/tasks/TaskCreationScreen.tsx`

**Features to Add/Enhance:**

- Task type selection (One-Time / Recurring) - matching mobile exactly
- Title input (required)
- Description textarea
- Priority selection (Low / Medium / High) - matching mobile UI
- Assignees selection (multi-select modal with user list, show selected users)
- Start date picker (custom date/time picker)
- Target date picker
- Due date picker (required, custom date/time picker)
- Recurrence type selection (if recurring: Weekly / Monthly / Daily)
- Auto-escalate toggle switch
- Save button (disabled until required fields filled)
- Cancel button
- Custom date picker component (matching mobile's scrollable picker with year/month/day/hour/minute)

**Implementation Details:**

- Replace current form with mobile-equivalent implementation
- Use custom date picker component (create reusable component)
- Implement assignee selection modal
- Match mobile form layout and styling exactly
- Use `taskService.createTask()` with exact field names from mobile

### Phase 5: Supporting Components

#### 5.1 Custom Date Picker Component

**File:** `web/src/components/shared/CustomDatePicker.tsx` (new)

**Features:**

- Scrollable columns for Year, Month, Day, Hour, Minute
- Current selection highlighting
- Matching mobile date picker UI
- Reusable for all date fields

#### 5.2 Message Action Sheet Component

**File:** `web/src/components/messaging/MessageActionSheet.tsx` (new or enhance existing MessageOptions)

**Features:**

- Reply option
- Copy option
- Edit option (if user's message)
- Delete option (if user's message: "Delete for me" / "Delete for everyone")
- Star/Unstar option
- React option (opens emoji picker)
- Cancel option
- Proper positioning and styling

#### 5.3 Emoji Picker Component

**File:** `web/src/components/messaging/EmojiPicker.tsx` (new)

**Features:**

- Common emojis grid (❤️, 😂, 😮, 😢, 🙏, 👍)
- Click to add reaction
- Modal overlay
- Matching mobile emoji picker UI

#### 5.4 Media Message Components

**Files:**

- `web/src/components/messaging/ImageMessage.tsx` (new)
- `web/src/components/messaging/VideoMessage.tsx` (new)
- `web/src/components/messaging/DocumentMessage.tsx` (new)
- `web/src/components/messaging/LocationMessage.tsx` (new)
- `web/src/components/messaging/VoiceMessage.tsx` (new)

**Features:**

- Proper rendering for each media type
- Thumbnails for videos
- File info for documents
- Map preview for locations
- Audio player for voice notes

### Phase 6: Socket Integration Enhancements

#### 6.1 Enhanced Socket Listeners

**File:** `web/src/services/socketService.ts`

**Add Listeners:**

- `typing` - for typing indicators
- `user_online` - for online status
- `user_offline` - for offline status
- `user_online_status` - for status updates
- `message_reaction_added` - for reaction updates
- `message_reaction_removed` - for reaction removal
- `message_edited` - for edited messages
- `message_deleted` - for deleted messages

**Implementation:**

- Add typed event handlers
- Ensure proper cleanup on component unmount
- Match mobile socket event handling exactly

### Phase 7: UI/UX Matching

#### 7.1 Styling and Theme

- Match mobile color scheme (PRIMARY_COLOR: #7C3AED, etc.)
- Match mobile spacing and typography
- Match mobile component sizes and layouts
- Ensure dark mode support matches mobile
- Match mobile animations and transitions

#### 7.2 Responsive Design

- Ensure web components work on different screen sizes
- Maintain mobile-like experience on web
- Proper touch/click interactions

## Files to Create/Modify

### New Files

1. `web/src/components/tasks/TaskCreateModal.tsx` - Task creation modal
2. `web/src/components/shared/CustomDatePicker.tsx` - Custom date picker
3. `web/src/components/messaging/MessageActionSheet.tsx` - Message action menu
4. `web/src/components/messaging/EmojiPicker.tsx` - Emoji picker
5. `web/src/components/messaging/ImageMessage.tsx` - Image message renderer
6. `web/src/components/messaging/VideoMessage.tsx` - Video message renderer
7. `web/src/components/messaging/DocumentMessage.tsx` - Document message renderer
8. `web/src/components/messaging/LocationMessage.tsx` - Location message renderer
9. `web/src/components/messaging/VoiceMessage.tsx` - Voice message renderer

### Modified Files

1. `web/src/screens/messaging/DirectChatConversation.tsx` - Add all mobile ChatScreen features
2. `web/src/screens/messaging/MainMessagingScreen.tsx` - Enhance to match ConversationsScreen
3. `web/src/screens/messaging/TaskGroupChatConversation.tsx` - Add missing features
4. `web/src/screens/tasks/TaskListManagement.tsx` - Replace/enhance to match TaskDashboardScreen
5. `web/src/screens/tasks/TaskDetailsScreen.tsx` - Enhance to match TaskDetailScreen
6. `web/src/screens/tasks/TaskCreationScreen.tsx` - Enhance to match TaskCreateScreen
7. `web/src/services/taskService.ts` - Verify/update to match mobile service exactly
8. `web/src/services/socketService.ts` - Add missing socket listeners
9. `web/src/components/messaging/MessageReactions.tsx` - Enhance if needed
10. `web/src/components/messaging/ReplyMessage.tsx` - Enhance if needed
11. `web/src/components/messaging/MessageOptions.tsx` - Enhance to match mobile action sheet

## Implementation Notes

### Backend Compatibility

- Use existing backend API endpoints (no modifications needed)
- Ensure request/response formats match mobile app exactly
- Handle both snake_case and camelCase response formats for compatibility

### Mobile App Preservation

- Do not modify any mobile app files
- Mobile app remains unchanged

### Existing Web Functionality

- Preserve all existing web features
- Add new features without breaking existing ones
- Maintain backward compatibility

### Testing Checklist

- [ ] All message features work (reactions, replies, editing, deleting, forwarding, starring)
- [ ] Typing indicators work
- [ ] Online/offline status works
- [ ] Media messages display correctly
- [ ] Message status updates work (sent/delivered/read)
- [ ] Conversation list updates in real-time
- [ ] Task dashboard matches mobile exactly
- [ ] Task creation works with all fields
- [ ] Task details display all information
- [ ] Accept/reject functionality works
- [ ] Date pickers work correctly
- [ ] All socket events work
- [ ] No regressions in existing functionality

## Success Criteria

1. Web message module matches mobile ChatScreen and ConversationsScreen exactly
2. Web task module matches mobile TaskDashboardScreen, TaskDetailScreen, and TaskCreateScreen exactly
3. All features from mobile are present and functional on web
4. Real-time updates work correctly
5. UI/UX matches mobile app
6. No existing web functionality is broken
7. Backend API is used without modifications

### To-dos

- [ ] Create conversationService.ts with all conversation API methods
- [ ] Update messageService.ts to add conversationId-based methods and message features (reactions, replies, forwarding)
- [ ] Enhance socketService.ts with better connection management and typed handlers
- [ ] Refactor MainMessagingScreen to use real conversations API and remove mock data
- [ ] Add real-time socket listeners to MainMessagingScreen for conversation updates
- [ ] Refactor DirectChatConversation to use conversationId instead of receiverId
- [ ] Add message features to DirectChatConversation (reactions, replies, forwarding, edit, delete)
- [ ] Implement proper message status handling and real-time updates in DirectChatConversation
- [ ] Refactor TaskGroupChatConversation to use conversationId instead of groupId
- [ ] Add group features and message capabilities to TaskGroupChatConversation
- [ ] Create MessageReactions, ReplyMessage, and MessageOptions UI components
- [ ] Update App.tsx routes to use conversationId pattern
- [ ] Test all features and ensure no regressions in existing functionality