export type AttemptOwner =
  | { kind: "user"; userId: string }
  | { kind: "anonymous"; anonymousSessionId: string };

export function attemptOwnerWhere(owner: AttemptOwner) {
  return owner.kind === "user"
    ? { userId: owner.userId }
    : { userId: null, anonymousSessionId: owner.anonymousSessionId };
}

export function attemptOwnerData(owner: AttemptOwner) {
  return owner.kind === "user"
    ? { userId: owner.userId, anonymousSessionId: null }
    : { userId: null, anonymousSessionId: owner.anonymousSessionId };
}
