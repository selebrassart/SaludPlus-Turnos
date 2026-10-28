"use server"

import * as reviewController from "@/controllers/ReviewController"
import { runAction, type ActionResult } from "@/lib/actionResult"
import type {
  PublicReviewDto,
  RatingSummary,
  ReviewDto,
  ReviewInput,
} from "@/models/Review"

export async function getMyReviewedAppointmentIds(): Promise<string[]> {
  return reviewController.findMyReviewedAppointmentIds()
}

export async function getDoctorReviews(doctorId: string): Promise<{
  summary: RatingSummary
  reviews: PublicReviewDto[]
}> {
  return reviewController.findForDoctor(doctorId)
}

export async function saveReview(
  input: ReviewInput
): Promise<ActionResult<ReviewDto>> {
  return runAction(() => reviewController.create(input))
}
