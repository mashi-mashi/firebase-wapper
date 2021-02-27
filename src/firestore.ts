import {CollectionReference, DocumentReference, Query} from '@google-cloud/firestore';
import {firestore} from 'firebase-admin';
import {EpochMillis, FirestoreDocumentType, NestedPartial, WithMetadata} from './utils/firestore-types';
import {deleteUndefinedRecursively} from './utils/utils';

export class Firestore {
  public static getFirestoreInstance = () => firestore();
  public static collection = (collectionPath: string) => firestore().collection(collectionPath);
  public static now = () => firestore.Timestamp.now();

  /**
   * @param data
   */
  public static beforeAdd = <T extends Omit<FirestoreDocumentType, 'id'>>(data: T): WithMetadata<T> => {
    const addData = {...data} as WithMetadata<T>;

    deleteUndefinedRecursively(addData);
    const now = Firestore.now();
    return {...addData, createdAt: now, updateAt: now, deleted: false};
  };

  /**
   * @param data
   */
  public static beforeSet = <T extends FirestoreDocumentType>(
    data: NestedPartial<T>
  ): WithMetadata<NestedPartial<T>> => {
    const setData = {...data} as NestedPartial<WithMetadata<T>>;
    if ('id' in setData) delete setData.id;
    if ('createdAt' in setData) delete setData.createdAt;
    if ('deletedAt' in setData) delete setData.deletedAt;
    deleteUndefinedRecursively(setData);
    setData.updatedAt = Firestore.now();
    return setData;
  };

  public static optimizeMergeOption = (merge?: boolean) => {
    // undefinedはtrueにする
    return merge ?? false;
  };

  public static add = async <T extends Omit<FirestoreDocumentType, 'id'>>(
    ref: DocumentReference<T>,
    data: T
  ): Promise<WithMetadata<T>> => {
    const addData = Firestore.beforeAdd(data);
    await ref.set(addData);
    return addData;
  };

  public static set = async <T extends FirestoreDocumentType>(
    ref: DocumentReference<T>,
    data: NestedPartial<T>,
    option?: {merge: boolean}
  ): Promise<WithMetadata<NestedPartial<T>>> => {
    const setData = Firestore.beforeSet(data);
    await ref.set(setData as T, {merge: option?.merge});
    return setData;
  };

  public static get = async <T extends FirestoreDocumentType>(ref: DocumentReference<T>): Promise<T | undefined> => {
    const doc = await ref.get();
    const data = doc.data();

    return data ? ({...data, id: doc.id} as T) : undefined;
  };

  /**
   * @param collectionRef
   * @param ids
   */
  public static getDocs = async <T extends FirestoreDocumentType>(
    collectionRef: CollectionReference<T>,
    ids: string[]
  ): Promise<T[]> => {
    if (!ids || !ids.length) {
      return [];
    }

    const uniqIds = Array.from(new Set(ids));

    const refs = uniqIds.map(id => firestore().doc(`${collectionRef.path}/${id}`));
    const docs = await firestore().getAll(...refs);

    return docs.map(doc => ({
      ...(doc.data() as T),
      id: doc.id,
    }));
  };

  public static delete = async <T extends FirestoreDocumentType>(
    ref: DocumentReference<T>
  ): Promise<FirestoreDocumentType> => {
    const current = await Firestore.get(ref);
    if (!current) throw new Error('data-not-found');

    const deleteData = {...current, deleted: true, deletedAt: Firestore.now} as any;
    await Firestore.set(ref, deleteData);
    return {id: ref.id};
  };
  public static forceDelete = async <T extends FirestoreDocumentType>(
    ref: DocumentReference<T>
  ): Promise<FirestoreDocumentType> => {
    await ref.delete();
    return {
      id: ref.id,
    };
  };

  public static getByQuery = async <T extends FirestoreDocumentType>(ref: Query<T>): Promise<T[]> =>
    (await ref.get()).docs.filter(d => d.exists).map(doc => ({...doc.data(), id: doc.id}));

  public static deleteFieldValue = (): any => firestore.FieldValue.delete();

  public static getByFieldValues = async <T extends {id: string}>(
    query: firestore.Query<T>,
    fieldName: string,
    values: any[],
    isFieldArray?: boolean
  ): Promise<T[]> => {
    const results: T[] = [];
    await Promise.all(
      Array.from({length: Math.ceil(values.length / 10)})
        .map((_, idx) => values.slice(idx * 10, (idx + 1) * 10))
        .map(async part => {
          const res = await Firestore.getByQuery(
            query.where(fieldName, isFieldArray ? 'array-contains-any' : 'in', part)
          );
          results.push(...res);
        })
    );
    return results;
  };

  public static timestampFromMillis = (millis: EpochMillis) => firestore.Timestamp.fromMillis(millis);
  public static timestampFromMillisIfNull = (millis?: EpochMillis) =>
    millis ? Firestore.timestampFromMillis(millis) : undefined;
}
