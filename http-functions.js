/*******************
 http-functions.js
********************
 
Wix Bookings API for Real Consult chatbot integration
 
***/

import { ok, badRequest, serverError } from "wix-http-functions";
import { services, availability, bookings as bookingsApi } from "wix-bookings-backend";

export function get_ping(request) {
  console.log("🏓 Ping test...");

  return ok({
    headers: { "Content-Type": "application/json" },
    body: {
      status: "success",
      message: "Wix Bookings API is working!",
      timestamp: new Date().toISOString(),
    },
  });
}

// 서비스 목록 조회 (올바른 API 사용)
export function get_services(request) {
  console.log("📋 Fetching Wix Bookings services...");

  return services
    .queryServices()
    .then((result) => {
      console.log("✅ Services found:", result.items?.length || 0);

      // 서비스 목록을 콘솔에 출력
      if (result.items && result.items.length > 0) {
        result.items.forEach((service) => {
          console.log(`🔍 Service: ${service.name} (ID: ${service._id})`);
        });
      }

      return ok({
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: {
          status: "success",
          data: result.items || [],
          count: result.items?.length || 0,
        },
      });
    })
    .catch((error) => {
      console.error("❌ Error fetching services:", error);

      return serverError({
        headers: { "Content-Type": "application/json" },
        body: {
          status: "error",
          message: error.message,
          details: "Make sure Wix Bookings is properly set up",
        },
      });
    });
}

// 가능한 시간 조회 (올바른 API 사용)
export function get_availability(request) {
  console.log("🔍 Checking availability...");

  const { serviceId, startDate, endDate } = request.query;

  const query = {
    filter: {
      serviceId: serviceId || "873ba4db-3cda-4f30-9bcb-6168575851c5", // 15-minute Consultation
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      bookable: true,
    },
  };

  availabilityCalendar
    .queryAvailability(query)
    .then((result) => {
      console.log("Result object:", result);

      return ok({
        body: {
          status: "success",
          timestamp: new Date().toISOString(),
        },
      });
    })
    .catch((error) => {
      console.error("Error fetching availability:", error);
      return ok({
        headers: { "Content-Type": "application/json" },
        body: {
          status: "error",
          message: "Failed to fetch availability",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    });
}

// 예약 생성 (올바른 API 사용)
export function post_createBooking(request) {
  console.log("📝 Creating new booking...");

  return request.body
    .json()
    .then((body) => {
      const { startTime, contactInfo, serviceId = "consultation-15min" } = body;

      console.log("📅 Booking request:", { startTime, contactInfo, serviceId });

      return bookingsApi.createBooking({
        booking: {
          serviceId: serviceId,
          slot: {
            startDate: startTime,
            endDate: new Date(new Date(startTime).getTime() + 15 * 60 * 1000).toISOString(), // 15분 후
          },
          contactDetails: {
            contactId: null, // 새 연락처
            firstName: contactInfo.name || contactInfo.firstName,
            lastName: contactInfo.lastName || "",
            email: contactInfo.email,
            phone: contactInfo.phone || "",
          },
          additionalFields: {
            source: "chatbot-modal",
            timestamp: new Date().toISOString(),
          },
        },
      });
    })
    .then((result) => {
      console.log("✅ Booking created successfully:", result.booking?._id);

      return ok({
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: {
          status: "success",
          bookingId: result.booking?._id,
          data: result.booking,
          message: "Booking created successfully",
        },
      });
    })
    .catch((error) => {
      console.error("❌ Error creating booking:", error);

      return badRequest({
        headers: { "Content-Type": "application/json" },
        body: {
          status: "error",
          message: error.message,
          details: "Failed to create booking - check service ID and contact info",
        },
      });
    });
}
