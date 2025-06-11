import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  Timestamp,
  doc,
  deleteDoc
} from 'firebase/firestore';

type FirestoreFrameProb = { frameIndex: number; realProb: number; fakeProb: number };

export interface AnalysisResult {
  id?: string;
  userId: string;
  videoName: string;
  prediction: string;
  confidence: number;
  justification: string;
  frames?: string[];
  frameProbs?: number[][];
  timestamp: Date;
  allowTraining: boolean;
}

export const saveAnalysisResult = async (result: Omit<AnalysisResult, 'id' | 'timestamp'>) => {
  try {
    // Convert nested arrays to a format Firestore can handle
    const firestoreData = {
      ...result,
      // Convert frameProbs array of arrays to an array of objects
      frameProbs: result.frameProbs?.map((probs, index) => ({
        frameIndex: index,
        realProb: probs[0],
        fakeProb: probs[1]
      })) || [],
      timestamp: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'analysisResults'), firestoreData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving analysis result:', error);
    throw error;
  }
};

export const getUserAnalysisHistory = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'analysisResults'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert frameProbs back to the original format
      const frameProbs = (data.frameProbs as FirestoreFrameProb[] | undefined)?.map((prob) => [prob.realProb, prob.fakeProb]) || [];
      return {
        id: doc.id,
        ...data,
        frameProbs
      };
    }) as AnalysisResult[];
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    throw error;
  }
};

export const getTrainingData = async () => {
  try {
    const q = query(
      collection(db, 'analysisResults'),
      where('allowTraining', '==', true),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert frameProbs back to the original format
      const frameProbs = (data.frameProbs as FirestoreFrameProb[] | undefined)?.map((prob) => [prob.realProb, prob.fakeProb]) || [];
      return {
        id: doc.id,
        ...data,
        frameProbs
      };
    }) as AnalysisResult[];
  } catch (error) {
    console.error('Error fetching training data:', error);
    throw error;
  }
};

export const deleteAnalysisResult = async (analysisId: string): Promise<void> => {
  try {
    const analysisRef = doc(db, 'analysisResults', analysisId);
    await deleteDoc(analysisRef);
  } catch (error) {
    console.error('Error deleting analysis result:', error);
    throw error;
  }
};