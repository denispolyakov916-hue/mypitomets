/**
 * UI Kit - Экспорт всех UI компонентов
 * 
 * Использование:
 * import { Button, Card, Modal, Input } from '@/components/ui'
 * 
 * или
 * 
 * import Button from '@/components/ui/Button'
 */

// Button
export { default as Button, ButtonGroup, IconButton } from './Button'

// Card
export {
  default as Card,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardBody,
  CardFooter,
  CardMedia,
} from './Card'

// Modal
export { default as Modal, ModalFooter, ConfirmModal } from './Modal'

// Input
export {
  default as Input,
  Textarea,
  Select,
  Checkbox,
} from './Input'

// Badge
export { default as Badge, StatusBadge, CountBadge } from './Badge'

// Progress
export { default as Progress, CourseProgress, CircularProgress } from './Progress'

