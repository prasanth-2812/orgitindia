import { query } from '../config/database';
import { Notification, NotificationType } from '../../../shared/src/types';

/**
 * Create a notification
 */
export const createNotification = async (
  userId: string,
  title: string,
  description: string | null,
  type: NotificationType,
  relatedEntityType: string | null = null,
  relatedEntityId: string | null = null
): Promise<Notification> => {
  const result = await query(
    `INSERT INTO notifications (
      id, user_id, title, description, type, related_entity_type, related_entity_id
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [userId, title, description, type, relatedEntityType, relatedEntityId]
  );

  return result.rows[0] as Notification;
};

/**
 * Get user notifications
 */
export const getUserNotifications = async (
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<Notification[]> => {
  let queryText = `
    SELECT * FROM notifications
    WHERE user_id = $1
  `;

  const params: any[] = [userId];

  if (unreadOnly) {
    queryText += ' AND is_read = false';
  }

  queryText += ' ORDER BY created_at DESC LIMIT $2';
  params.push(limit);

  const result = await query(queryText, params);
  return result.rows as Notification[];
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  await query(
    `UPDATE notifications 
     SET is_read = true, read_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  await query(
    `UPDATE notifications 
     SET is_read = true, read_at = NOW()
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
};

/**
 * Delete notification
 */
export const deleteNotification = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  await query(
    `DELETE FROM notifications 
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
};

