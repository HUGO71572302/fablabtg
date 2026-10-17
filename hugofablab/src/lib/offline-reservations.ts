export type PendingReservation = {
  id: string;
  userId: number;
  resourceId: number;
  date: string;
  start: string;
  duration: number;
  purpose: string;
  createdAt: number;
};

export type PendingCheckin = {
  id: string;
  userId: number;
  reservationId: number;
  createdAt: number;
};

const DATABASE = "hugo-fablab-offline";
const RESERVATIONS = "reservations";
const CHECKINS = "checkins";
const PRIVATE_PAGES_CACHE = "hf-private-pages-v1";

/** Efface uniquement les pages contenant des données du compte ; conserve les opérations en attente. */
export async function clearPrivateOfflinePages(): Promise<void> {
  if (typeof caches !== "undefined") await caches.delete(PRIVATE_PAGES_CACHE);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RESERVATIONS)) database.createObjectStore(RESERVATIONS, { keyPath: "id" });
      if (!database.objectStoreNames.contains(CHECKINS)) database.createObjectStore(CHECKINS, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossible d’ouvrir le stockage hors ligne."));
  });
}

export async function savePendingReservation(reservation: PendingReservation): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(RESERVATIONS, "readwrite");
      transaction.objectStore(RESERVATIONS).put(reservation);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Impossible de conserver la réservation hors ligne."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Le stockage de la réservation hors ligne a été interrompu."));
    });
  } finally {
    database.close();
  }
}

export async function listPendingReservations(userId: number): Promise<PendingReservation[]> {
  const database = await openDatabase();
  try {
    const all = await new Promise<PendingReservation[]>((resolve, reject) => {
      const transaction = database.transaction(RESERVATIONS, "readonly");
      const request = transaction.objectStore(RESERVATIONS).getAll();
      request.onsuccess = () => resolve(request.result as PendingReservation[]);
      request.onerror = () => reject(request.error ?? new Error("Impossible de lire les réservations hors ligne."));
    });
    return all.filter((reservation) => reservation.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
  } finally {
    database.close();
  }
}

export async function removePendingReservation(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(RESERVATIONS, "readwrite");
      transaction.objectStore(RESERVATIONS).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Impossible de supprimer la réservation synchronisée."));
      transaction.onabort = () => reject(transaction.error ?? new Error("La suppression de la réservation synchronisée a été interrompue."));
    });
  } finally {
    database.close();
  }
}

export async function savePendingCheckin(checkin: PendingCheckin): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(CHECKINS, "readwrite");
      transaction.objectStore(CHECKINS).put(checkin);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Impossible de conserver le pointage hors ligne."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Le stockage du pointage hors ligne a été interrompu."));
    });
  } finally {
    database.close();
  }
}

export async function listPendingCheckins(userId: number, reservationId: number): Promise<PendingCheckin[]> {
  const database = await openDatabase();
  try {
    const all = await new Promise<PendingCheckin[]>((resolve, reject) => {
      const transaction = database.transaction(CHECKINS, "readonly");
      const request = transaction.objectStore(CHECKINS).getAll();
      request.onsuccess = () => resolve(request.result as PendingCheckin[]);
      request.onerror = () => reject(request.error ?? new Error("Impossible de lire les pointages hors ligne."));
    });
    return all.filter((checkin) => checkin.userId === userId && checkin.reservationId === reservationId);
  } finally {
    database.close();
  }
}

export async function removePendingCheckin(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(CHECKINS, "readwrite");
      transaction.objectStore(CHECKINS).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Impossible de supprimer le pointage synchronisé."));
      transaction.onabort = () => reject(transaction.error ?? new Error("La suppression du pointage synchronisé a été interrompue."));
    });
  } finally {
    database.close();
  }
}

export async function clearOfflineData(): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([RESERVATIONS, CHECKINS], "readwrite");
      transaction.objectStore(RESERVATIONS).clear();
      transaction.objectStore(CHECKINS).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Impossible d’effacer les données hors ligne."));
      transaction.onabort = () => reject(transaction.error ?? new Error("L’effacement des données hors ligne a été interrompu."));
    });
  } finally {
    database.close();
  }
}
