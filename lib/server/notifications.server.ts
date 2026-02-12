"use server";

import prisma from "../prisma";
import { Resend } from "resend";
import { NotificationType } from "@/lib/generated/prisma";
import { buildSlug } from "@/app/profile/utils/buildSlug";


// Environment
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

// Create Resend client safely
function getResendClient() {
    if (!RESEND_API_KEY) {
        console.warn("⚠️ RESEND_API_KEY not configured. Emails disabled.");
        return null;
    }
    return new Resend(RESEND_API_KEY);
}

export async function createNotification({
    userId,
    fromUserId,
    type,
    entityId,
}: {
    userId: string;
    fromUserId: string;
    type: NotificationType;
    entityId?: string;
}) {
    const notification = await prisma.notification.create({
        data: {
            userId,
            fromUserId,
            type,
            entityId,
        },
    });

    // Send email async (non-blocking)
    sendNotificationEmail(userId, fromUserId, type).catch(console.error);

    return notification;
}

async function sendNotificationEmail(
    recipientId: string,
    senderId: string,
    type: NotificationType
) {
    try {
        const resend = getResendClient();
        if (!resend) return;

        const [recipient, sender] = await Promise.all([
            prisma.user.findUnique({
                where: { id: recipientId },
                select: { email: true, username: true },
            }),
            prisma.user.findUnique({
                where: { id: senderId },
                select: { id: true, username: true },
            }),
        ]);

        if (!recipient?.email || !sender?.username) return;

        const slug = buildSlug(sender.username, sender.id);
        const profileUrl = `${APP_URL}/profile/${slug}`;
        const notificationsUrl = `${APP_URL}/notifications`;

        let subject = "";
        let html = "";

        if (type === "CONNECTION_REQUEST") {
            subject = `${sender.username} sent you a connection request`;

            html = `
  <div style="font-family: Arial, sans-serif; background:#f4f6fb; padding:40px 0;">
    <div style="max-width:520px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background: linear-gradient(90deg, #4f46e5, #7c3aed); padding:20px; text-align:center;">
        <h2 style="color:white; margin:0;">🤝 New Connection Request</h2>
      </div>

      <!-- Body -->
      <div style="padding:30px; text-align:center;">
        <p style="font-size:16px; color:#333;">
          <strong>${sender.username}</strong> wants to connect with you.
        </p>

        <p style="font-size:14px; color:#666; margin-bottom:25px;">
          View their profile and respond to the connection request.
        </p>

        <!-- Buttons -->
        <div style="margin-bottom:25px;">
          <a href="${profileUrl}"
            style="display:inline-block;
                   padding:12px 24px;
                   background:#4f46e5;
                   color:white;
                   text-decoration:none;
                   border-radius:8px;
                   font-weight:bold;
                   margin-right:10px;">
            View Profile
          </a>

          <a href="${notificationsUrl}"
            style="display:inline-block;
                   padding:12px 24px;
                   border:2px solid #4f46e5;
                   color:#4f46e5;
                   text-decoration:none;
                   border-radius:8px;
                   font-weight:bold;">
            See Notifications
          </a>
        </div>

        <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

        <p style="font-size:12px; color:#999;">
          You're receiving this because someone sent you a connection request on AU Connect.
        </p>
      </div>
    </div>
  </div>
  `;
        }


        if (type === "CONNECTION_ACCEPTED") {
            subject = `${sender.username} accepted your connection request`;

            html = `
  <div style="font-family: Arial, sans-serif; background:#f4f6fb; padding:40px 0;">
    <div style="max-width:520px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background: linear-gradient(90deg, #10b981, #059669); padding:20px; text-align:center;">
        <h2 style="color:white; margin:0;">🎉 Connection Accepted</h2>
      </div>

      <!-- Body -->
      <div style="padding:30px; text-align:center;">
        <p style="font-size:16px; color:#333;">
          <strong>${sender.username}</strong> accepted your connection request.
        </p>

        <div style="margin:25px 0;">
          <a href="${profileUrl}"
            style="display:inline-block;
                   padding:12px 24px;
                   background:#10b981;
                   color:white;
                   text-decoration:none;
                   border-radius:8px;
                   font-weight:bold;">
            View Profile
          </a>
        </div>

        <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

        <p style="font-size:12px; color:#999;">
          You're receiving this because someone accepted your connection request on AU Connect.
        </p>
      </div>
    </div>
  </div>
  `;
        }


        if (type !== "CONNECTION_REQUEST" && type !== "CONNECTION_ACCEPTED") {
            return; // Only email for connection events
        }


        await resend.emails.send({
            from: EMAIL_FROM,
            to: recipient.email,
            subject,
            html,
        });
    } catch (error) {
        console.error("Email send failed:", error);
    }
}
