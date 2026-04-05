const BookingsSection = () => {
  return (
    <section className="pb-16 grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <div className="rounded-3xl bg-white p-8 shadow-soft">
          <h2 className="text-xl font-semibold">Current bookings</h2>
          <p className="mt-1 text-sm text-black/60">
            Public availability overview. Booking owner details are visible
            after sign-in.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-black/50 uppercase text-xs">
                <tr>
                  <th className="py-3">Resource</th>
                  <th className="py-3">Start</th>
                  <th className="py-3">End</th>
                </tr>
              </thead>
              <tbody id="reservationTable" className="divide-y">
                <tr>
                  <td className="py-4">Meeting Room 1</td>
                  <td className="py-4">10:00 AM</td>
                  <td className="py-4">11:00 AM</td>
                </tr>
                <tr>
                  <td className="py-4">Projector A</td>
                  <td className="py-4">01:00 PM</td>
                  <td className="py-4">04:00 PM</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingsSection;