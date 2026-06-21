import { db } from '../firebase'
import {
  collection, doc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy
} from 'firebase/firestore'

const getTachesRef = (userId) =>
  collection(db, 'objectifs', userId, 'taches')

const getCompletionRef = (userId, date) =>
  doc(db, 'objectifs', userId, 'completions', date)

// Lire toutes les tâches actives
export const getTaches = async (userId) => {
  const q = query(getTachesRef(userId), where('actif', '==', true))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

// Ajouter une tâche
export const ajouterTache = async (userId, tache) => {
  const ref = await addDoc(getTachesRef(userId), {
    ...tache,
    actif: true,
    createdAt: new Date().toISOString()
  })
  return ref.id
}

// Supprimer une tâche (soft delete)
export const supprimerTache = async (userId, tacheId) => {
  const ref = doc(getTachesRef(userId), tacheId)
  await updateDoc(ref, { actif: false })
}

// Lire les completions d'un jour
export const getCompletions = async (userId, date) => {
  const ref = getCompletionRef(userId, date)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : {}
}

// Cocher / décocher une tâche
export const toggleCompletion = async (userId, date, tacheId, valeur) => {
  const ref = getCompletionRef(userId, date)
  await setDoc(ref, { [tacheId]: valeur }, { merge: true })
}