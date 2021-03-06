import FirebaseFirestore from '@google-cloud/firestore';

export type Timestamp = FirebaseFirestore.Timestamp;
export type EpochMillis = number;

export type FirestoreDocumentType = {
  id: string;
};

export type OptionalId<T> = Omit<T, 'id'> & {id?: string};

// https://stackoverflow.com/questions/47914536/use-partial-in-nested-property-with-typescript
export type NestedPartial<T> = T extends Record<string, unknown>
  ? {
      [K in keyof T]?: T[K] extends (infer R)[] ? NestedPartial<R>[] : NestedPartial<T[K]>;
    }
  : T;

export type NestedReadonly<T> = {
  [K in keyof T]: T[K] extends Array<infer R> ? Readonly<Array<NestedReadonly<R>>> : Readonly<NestedReadonly<T[K]>>;
};

export type DeepTimestampToMillis<T> = T extends Array<infer R>
  ? Array<DeepTimestampToMillis<R>>
  : T extends Record<string, any>
  ? {
      [K in keyof T]: T[K] extends Timestamp
        ? EpochMillis
        : T[K] extends Timestamp | undefined
        ? EpochMillis | undefined
        : T[K] extends Array<infer R>
        ? Array<DeepTimestampToMillis<R>>
        : T[K] extends Record<string, any>
        ? DeepTimestampToMillis<T[K]>
        : T[K];
    }
  : T extends Timestamp
  ? EpochMillis
  : T;

export type WithMetadata<T> = T & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deleted: boolean;
  deletedAt?: Timestamp;
};

export type CollectionReference<T> = FirebaseFirestore.CollectionReference<T>;
export type DocumentReference<T extends FirestoreDocumentType> = FirebaseFirestore.DocumentReference<T>;
export type Query<T extends FirestoreDocumentType> = FirebaseFirestore.Query<T>;
