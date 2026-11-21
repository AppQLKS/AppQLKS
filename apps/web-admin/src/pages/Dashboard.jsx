import { useOutletContext } from 'react-router-dom';
import KpiRow from '../components/KpiRow.jsx';
import RoomPanel from '../components/RoomPanel.jsx';
import TaskQueueTable from '../components/TaskQueueTable.jsx';

export default function Dashboard() {
  const { rooms, requests, setRequests } = useOutletContext();
  return (
    <>
      <KpiRow rooms={rooms} requests={requests} />
      <RoomPanel rooms={rooms} />
      <TaskQueueTable requests={requests} setRequests={setRequests} />
    </>
  );
}
