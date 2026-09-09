/** Leading refresh plus a bounded trailing refresh: continuous movement cannot
 * postpone updates indefinitely. A given window never renders concurrently. */
export function createLiveGatheringRefresh(getApplications, schedule = setTimeout) {
  let timer = null;
  let dirty = false;
  const pending = new WeakMap();
  function refresh(application) {
    if (pending.has(application)) { pending.set(application, true); return; }
    pending.set(application, false);
    Promise.resolve().then(() => application.render({ force: true })).catch(error => {
      console.error("Wrathmaker | Gathering refresh failed", error);
    }).finally(() => {
      const again = pending.get(application);
      pending.delete(application);
      if (again && application.workbenchState.tab === "gather") refresh(application);
    });
  }
  function flush() {
    dirty = false;
    for (const application of getApplications()) {
      if (application.workbenchState.tab === "gather") refresh(application);
    }
    timer = schedule(() => {
      timer = null;
      if (dirty) flush();
    }, 75);
  }
  return () => { dirty = true; if (timer === null) flush(); };
}
