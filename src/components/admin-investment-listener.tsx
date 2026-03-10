'use client';

import { useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Investment } from '@/types';
import { processInvestmentBonus } from '@/lib/actions';

export function AdminInvestmentListener() {
  useEffect(() => {
    console.log('Admin investment listener starting...');
    
    // This query looks for investments that are active but have not had their bonus processed.
    // bonoPagado != true includes documents where the field is false or doesn't exist.
    const investmentsQuery = query(
      collection(db, 'investments'),
      where('status', '==', 'Activo'),
      where('bonoPagado', '!=', true)
    );

    const unsubscribe = onSnapshot(investmentsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        // We only care about newly added documents that match the query.
        if (change.type === 'added') {
          const investment = { id: change.doc.id, ...change.doc.data() } as Investment;
          console.log(`New active investment detected: ${investment.id} for user ${investment.userId}`);

          const investmentRef = doc(db, 'investments', investment.id);

          // Immediately mark the investment as 'processing' to prevent the listener
          // from picking it up again in case of a quick re-render or multiple snapshots.
          updateDoc(investmentRef, { bonoPagado: 'processing' }).then(() => {
            // Call server action to handle the bonus logic
            processInvestmentBonus(investment)
              .then(() => {
                 console.log(`Successfully processed bonus for investment ${investment.id}`);
              })
              .catch(error => {
                console.error(`Failed to process bonus for investment ${investment.id}:`, error);
                // On failure, revert the status so it can be picked up again or inspected manually.
                updateDoc(investmentRef, { bonoPagado: false, error: error.message });
              });
          });
        }
      });
    }, (error) => {
      console.error("Admin Investment Listener error (check admin permissions for 'investments' collection):", error);
    });

    return () => {
      console.log('Admin investment listener stopping...');
      unsubscribe();
    };
  }, []);

  return null; // This component does not render anything.
}
