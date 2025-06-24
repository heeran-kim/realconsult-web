import wixBookingsFrontend from "wix-bookings-frontend";
import { triggeredEmails } from "wix-crm-frontend";
import { local } from "wix-storage-frontend";

const SERVICE_ID = "873ba4db-3cda-4f30-9bcb-6168575851c5";
const EMAIL_CONFIG = {
  EMAIL_ID: "booking_notification_admin",
  CONTACT_ID: "4ebe61b2-dd62-4b9b-a559-62e04b4579a9", // "6fd5a75d-3d71-4751-ad1a-f1da9f14fb64"
};

$w.onReady(async function () {
  const data = await getAvailableSlots();
  local.setItem("globalBookingData", JSON.stringify(data));
  local.setItem("isDataReady", "true");

  $w("#htmlHeader").onMessage(async (event) => {
    if (event.data.type === "CREATE_BOOKING") {
      await sendBookingNotification(event.data.data);
    }
  });
});

async function getAvailableSlots() {
  try {
    const serviceAvailability = await wixBookingsFrontend.getServiceAvailability(SERVICE_ID);
    const slots = serviceAvailability.slots || [];
    const availabilityByDate = {};

    slots.forEach((slot) => {
      if (slot.bookable === true) {
        const startDateTime = slot.startDateTime;
        if (startDateTime) {
          const date = `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, "0")}-${String(
            startDateTime.getDate()
          ).padStart(2, "0")}`;
          const time = `${String(startDateTime.getHours()).padStart(2, "0")}:${String(startDateTime.getMinutes()).padStart(2, "0")}`;

          if (!availabilityByDate[date]) {
            availabilityByDate[date] = [];
          }

          if (!availabilityByDate[date].includes(time)) {
            availabilityByDate[date].push(time);
          }
        }
      }
    });
    return availabilityByDate;
  } catch (error) {
    console.error("Frontend booking API error:", error);
    return {};
  }
}

async function createBooking(bookingData) {
  try {
    const serviceAvailability = await wixBookingsFrontend.getServiceAvailability(SERVICE_ID);
    const chosenSlot = serviceAvailability.slots.find((slot) => {
      const slotDate = slot.startDateTime.toISOString().split("T")[0];
      const slotTime = `${String(slot.startDateTime.getHours()).padStart(2, "0")}:${String(slot.startDateTime.getMinutes()).padStart(2, "0")}`;

      return slotDate === bookingData.date && slotTime === bookingData.time;
    });

    if (!chosenSlot) {
      throw new Error("Selected time slot not found.");
    }

    let formFieldValues = [
      {
        _id: "00000000-0000-0000-0000-000000000001",
        value: bookingData.name,
      },
      {
        _id: "00000000-0000-0000-0000-000000000002",
        value: bookingData.email,
      },
      {
        _id: "00000000-0000-0000-0000-000000000008",
        value: bookingData.message || "Booking via website chatbot",
      },
    ];

    let bookingInfo = {
      slot: chosenSlot,
      formFields: formFieldValues,
    };
    console.log("Booking Info:", bookingInfo);

    const results = await wixBookingsFrontend.checkoutBooking(bookingInfo);

    console.log("Booking successful:", results);
    console.log("Booking ID:", results.bookingId);
    console.log("Status:", results.status);

    $w("#htmlHeader").postMessage({
      type: "BOOKING_SUCCESS",
    });
  } catch (error) {
    console.error("Booking failed:", error);

    $w("#htmlHeader").postMessage({
      type: "BOOKING_ERROR",
      error: error.message,
    });
  }
}

async function sendBookingNotification(bookingData) {
  try {
    const options = {
      variables: {
        customerName: bookingData.name,
        customerEmail: bookingData.email,
        selectedDate: bookingData.date,
        selectedTime: bookingData.time,
        message: bookingData.message || "No additional message",
        SITE_URL: "https://www.real-consult.com.au/",
      },
    };
    await triggeredEmails.emailMember(EMAIL_CONFIG.EMAIL_ID, EMAIL_CONFIG.CONTACT_ID, options);
    return { success: true };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error.message };
  }
}
