import "server-only"
import { AppointmentRepository } from "@/repository/AppointmentRepository"
import { BranchRepository } from "@/repository/BranchRepository"
import { MedicRepository } from "@/repository/MedicRepository"
import { NotificationRepository } from "@/repository/NotificationRepository"
import { PatientRepository } from "@/repository/PatientRepository"
import { ReviewRepository } from "@/repository/ReviewRepository"
import { SpecialtyRepository } from "@/repository/SpecialtyRepository"
import { UserRepository } from "@/repository/UserRepository"
import { AppointmentService } from "./AppointmentService"
import { AuthService } from "./AuthService"
import { BranchService } from "./BranchService"
import { MedicService } from "./MedicService"
import { NotificationService } from "./NotificationService"
import { PatientService } from "./PatientService"
import { ProfileService } from "./ProfileService"
import { ReviewService } from "./ReviewService"
import { SeedService } from "./SeedService"
import { SpecialtyService } from "./SpecialtyService"
import { UserService } from "./UserService"

/**
 * Single place where the object graph is wired.
 *
 * Every controller used to rebuild its own services, so adding a dependency
 * meant editing each of them and the copies drifted apart. The instances are
 * stateless — they only hold repositories — so sharing them per server process
 * is safe.
 */

const appointmentRepository = new AppointmentRepository()
const branchRepository = new BranchRepository()
const medicRepository = new MedicRepository()
const notificationRepository = new NotificationRepository()
const patientRepository = new PatientRepository()
const reviewRepository = new ReviewRepository()
const specialtyRepository = new SpecialtyRepository()
const userRepository = new UserRepository()

export const branchService = new BranchService(branchRepository)

export const medicService = new MedicService(
  medicRepository,
  specialtyRepository,
  branchRepository,
  userRepository
)

export const patientService = new PatientService(
  patientRepository,
  userRepository
)

export const specialtyService = new SpecialtyService(
  specialtyRepository,
  medicRepository
)

export const userService = new UserService(
  userRepository,
  medicService,
  patientService
)

export const authService = new AuthService(
  userRepository,
  medicService,
  patientService
)

export const notificationService = new NotificationService(
  notificationRepository,
  appointmentRepository,
  patientRepository,
  medicRepository
)

export const appointmentService = new AppointmentService(
  appointmentRepository,
  medicRepository,
  patientService,
  notificationService
)

export const reviewService = new ReviewService(
  reviewRepository,
  appointmentRepository,
  medicRepository,
  patientService,
  notificationService
)

export const profileService = new ProfileService(
  patientRepository,
  medicRepository,
  specialtyRepository,
  appointmentRepository
)

export const seedService = new SeedService(
  userRepository,
  patientRepository,
  medicRepository,
  specialtyRepository,
  branchRepository
)
