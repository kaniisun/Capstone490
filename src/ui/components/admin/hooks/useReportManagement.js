import { useState, useCallback } from "react";
import { supabase } from "../../../../supabaseClient";

export const useReportManagement = (setSnackbar) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all pending reports (both post and message reports)
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching reports...");

      // Check if there are any reports at all in the table
      const { data: allReportsCheck, error: allReportsError } = await supabase
        .from("reports")
        .select("*");

      console.log(
        "All reports in table (raw check):",
        allReportsCheck?.length || 0
      );
      if (allReportsCheck && allReportsCheck.length > 0) {
        console.log("Sample raw report:", allReportsCheck[0]);
      }

      if (allReportsError) {
        console.error("Error checking all reports:", allReportsError);
      }

      // First, fetch reports for posts
      const { data: postReports, error: postError } = await supabase
        .from("reports")
        .select(
          `
          report_id,
          reporter_id,
          reported_id,
          reported_item_id,
          report_type,
          status,
          report,
          created_at,
          updated_at,
          reporter:reporter_id(userID, firstName, lastName),
          reported:reported_id(userID, firstName, lastName)
        `
        )
        .eq("status", "open")
        .eq("report_type", "post")
        .order("created_at", { ascending: false });

      console.log("Post reports fetched:", postReports?.length || 0);
      if (postError) {
        console.error("Error fetching post reports:", postError);
        throw postError;
      }

      // Then fetch message reports
      const { data: messageReports, error: messageError } = await supabase
        .from("reports")
        .select(
          `
          report_id,
          reporter_id,
          reported_id,
          reported_item_id,
          report_type,
          status,
          report,
          created_at,
          updated_at,
          reporter:reporter_id(userID, firstName, lastName),
          reported:reported_id(userID, firstName, lastName)
        `
        )
        .eq("status", "open")
        .eq("report_type", "message")
        .order("created_at", { ascending: false });

      console.log("Message reports fetched:", messageReports?.length || 0);
      if (messageError) {
        console.error("Error fetching message reports:", messageError);
        throw messageError;
      }

      // Debug all message reports
      if (messageReports && messageReports.length > 0) {
        console.log("All message reports:", messageReports);
      }

      // For post reports, fetch the post content
      const postIds = postReports.map((report) => report.reported_item_id);
      let posts = [];
      if (postIds.length > 0) {
        const { data: postsData, error: postsError } = await supabase
          .from("open_board")
          .select("open_board_id, content, title, creator_id")
          .in("open_board_id", postIds);

        if (postsError) throw postsError;
        posts = postsData || [];
      }

      // For message reports, fetch the message content
      const messageIds = [];

      // Extract the actual message UUIDs from the report text since we now store them there
      messageReports.forEach((report) => {
        // Try to extract UUID from the report text using regex
        const reportText = report.report || "";
        const match = reportText.match(/Message ID: ([0-9a-f-]+)/i);
        if (match && match[1]) {
          messageIds.push(match[1]); // Add the UUID we found
        }
      });

      let messages = [];
      if (messageIds.length > 0) {
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("id, content, sender_id, receiver_id, created_at")
          .in("id", messageIds);

        if (messagesError) throw messagesError;
        messages = messagesData || [];
      }

      // Combine the reports with their content
      const processedPostReports = postReports.map((report) => {
        const post = posts.find(
          (p) => p.open_board_id === report.reported_item_id
        );
        return {
          ...report,
          content: post?.content || post?.title || "Content unavailable",
          fullContent: post || {},
          reportedUserName: getFullName(report.reported),
          reporterName: getFullName(report.reporter),
        };
      });

      const processedMessageReports = messageReports.map((report) => {
        // Extract message ID from report text
        const reportText = report.report || "";
        const match = reportText.match(/Message ID: ([0-9a-f-]+)/i);
        const messageId = match && match[1];

        // Find the message using the extracted ID
        const message = messageId
          ? messages.find((m) => m.id === messageId)
          : null;

        return {
          ...report,
          content: message?.content || "Content unavailable",
          fullContent: message || {},
          reportedUserName: getFullName(report.reported),
          reporterName: getFullName(report.reporter),
        };
      });

      // Combine all reports
      const allReports = [...processedPostReports, ...processedMessageReports];

      // Sort by date (most recent first)
      allReports.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setReports(allReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setError(error.message);

      if (setSnackbar) {
        setSnackbar({
          open: true,
          message: `Error fetching reports: ${error.message}`,
          severity: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [setSnackbar]);

  // Helper function to get full name from user object
  const getFullName = (user) => {
    if (!user) return "Unknown User";
    return (
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.userID ||
      "Unknown User"
    );
  };

  // Dismiss a report (set status to 'dismissed')
  const dismissReport = async (reportId) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status: "dismissed",
          updated_at: new Date().toISOString(),
        })
        .eq("report_id", reportId);

      if (error) throw error;

      // Update local state
      setReports((prev) =>
        prev.filter((report) => report.report_id !== reportId)
      );

      if (setSnackbar) {
        setSnackbar({
          open: true,
          message: "Report dismissed successfully",
          severity: "success",
        });
      }

      return true;
    } catch (error) {
      console.error("Error dismissing report:", error);

      if (setSnackbar) {
        setSnackbar({
          open: true,
          message: `Error dismissing report: ${error.message}`,
          severity: "error",
        });
      }

      return false;
    }
  };

  // Ban user and handle the reported content
  const banUserAndHandleContent = async (report) => {
    try {
      // Start a transaction
      const updates = [];

      // 1. Update report status to 'banned'
      updates.push(
        supabase
          .from("reports")
          .update({
            status: "banned",
            updated_at: new Date().toISOString(),
          })
          .eq("report_id", report.report_id)
      );

      // 2. Ban the user (set accountStatus to 'suspended')
      updates.push(
        supabase
          .from("users")
          .update({
            accountStatus: "suspended",
            modified_at: new Date().toISOString(),
          })
          .eq("userID", report.reported_id)
      );

      // 3. Handle the content based on report type
      if (report.report_type === "post") {
        // For posts, delete the post from open_board
        updates.push(
          supabase
            .from("open_board")
            .delete()
            .eq("open_board_id", report.reported_item_id)
        );
      } else if (report.report_type === "message") {
        // Extract real message ID from report text
        const reportText = report.report || "";
        const match = reportText.match(/Message ID: ([0-9a-f-]+)/i);
        const messageId = match && match[1];

        if (messageId) {
          // For messages, update status to flagged
          updates.push(
            supabase
              .from("messages")
              .update({
                status: "flagged",
                updated_at: new Date().toISOString(),
              })
              .eq("id", messageId)
          );
        } else {
          // Log an error if we couldn't extract the message ID
          console.error("Could not extract message ID from report:", report);
        }
      }

      // Execute all updates
      const results = await Promise.all(updates.map((p) => p));

      // Check for errors
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(errors.map((e) => e.error.message).join(", "));
      }

      // Update local state
      setReports((prev) =>
        prev.filter((r) => r.report_id !== report.report_id)
      );

      if (setSnackbar) {
        setSnackbar({
          open: true,
          message: `User banned and ${report.report_type} has been removed`,
          severity: "success",
        });
      }

      return true;
    } catch (error) {
      console.error("Error banning user and handling content:", error);

      if (setSnackbar) {
        setSnackbar({
          open: true,
          message: `Error processing ban: ${error.message}`,
          severity: "error",
        });
      }

      return false;
    }
  };

  return {
    reports,
    loading,
    error,
    fetchReports,
    dismissReport,
    banUserAndHandleContent,
  };
};
