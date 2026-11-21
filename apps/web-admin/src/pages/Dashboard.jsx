import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import CheckoutBanner from '../components/CheckoutBanner.jsx';
import KpiRow from '../components/KpiRow.jsx';
import RoomPanel from '../components/RoomPanel.jsx';
import TaskQueueTable from '../components/TaskQueueTable.jsx';

export default function Dashboard() {
  const { rooms, requests, setRequests, checkouts, canCheckout, reload } = useOutletContext();
  const [selected, setSelected] = useState('204');

  return (
    <>
      <CheckoutBanner checkouts={checkouts} onReview={setSelected} onDone={reload} />
      <KpiRow rooms={rooms} requests={requests} />
      <RoomPanel rooms={rooms} selected={selected} onSelect={setSelected} canCheckout={canCheckout} onCheckedOut={reload} />
      <TaskQueueTable requests={requests} setRequests={setRequests} reload={reload} />
    </>
  );
}
