import { Navigate, Route, Routes } from 'react-router-dom';
import CoursesTable from '../admin/components/Tables/CoursesTable';
import CourseEditorPage from '../admin/components/Courses/CourseEditorPage';
import SpecialistLayout from './components/SpecialistLayout';

const SpecialistApp = () => (
  <SpecialistLayout>
    <Routes>
      <Route index element={<Navigate to="courses" replace />} />
      <Route
        path="courses"
        element={<CoursesTable panelBase="/specialist-panel" specialistMode />}
      />
      <Route
        path="courses/:id/edit"
        element={<CourseEditorPage panelBase="/specialist-panel" specialistMode />}
      />
      <Route path="*" element={<Navigate to="courses" replace />} />
    </Routes>
  </SpecialistLayout>
);

export default SpecialistApp;
