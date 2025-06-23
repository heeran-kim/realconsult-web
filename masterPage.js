import wixBookingsFrontend from "wix-bookings-frontend";
import { local } from "wix-storage-frontend";

const SERVICE_ID = "873ba4db-3cda-4f30-9bcb-6168575851c5";

$w.onReady(async function () {
  const data = await getAvailableSlots();

  local.setItem("globalBookingData", JSON.stringify(data));
  local.setItem("isDataReady", "true");
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
