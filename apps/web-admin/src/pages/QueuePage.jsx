import { useOutletContext } from 'react-router-dom';
import TaskQueueTable from '../components/TaskQueueTable.jsx';

/** Trang riêng cho bếp / buồng phòng: chỉ hiện hàng đợi đã lọc theo bộ phận. */
export default function QueuePage({ department }) {
  const { requests, setRequests, reload } = useOutletContext();
  return <TaskQueueTable key={department} requests={requests} setRequests={setRequests} reload={reload} initialDept={department} />;
}
