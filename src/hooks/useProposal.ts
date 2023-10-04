import { useQuery } from 'react-query';
import { nostrPool } from '@/services/nostr';
import { Bitpac, NostrEvent, Proposal } from '@/types';
import { Event } from 'nostr-tools';

interface EventWithVotes extends Event<number> {
  votes?: Event<number>[];
}

const fetchProposals = async (
  pubkeys: string[],
  bitpacId: string
): Promise<EventWithVotes[]> => {
  if (!bitpacId) return [];

  const filter = [
    {
      authors: pubkeys,
      kinds: [2859],
      '#e': [bitpacId],
      since: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30, // a month ago
    },
  ];

  const proposals = await nostrPool.list(filter);
  return proposals;
};

const fetchVotes = async (proposalEventId: string): Promise<Event[]> => {
  if (!proposalEventId) return [];

  const filter = [
    {
      kinds: [2860],
      '#e': [proposalEventId],
    },
  ];

  const votes = await nostrPool.list(filter);

  // Order votes by created_at and filter out votes of the same pubkey, keeping only the first vote
  const orderedVotes = votes.sort((a, b) => a.created_at - b.created_at);
  const filteredVotes = orderedVotes.filter((vote, index, self) =>
    index === self.findIndex((v) => v.pubkey === vote.pubkey)
  );

  return filteredVotes;
};

const fetchProposalsAndVotes = async (
  pubkeys: string[],
  bitpacId: string
): Promise<{ proposals: EventWithVotes[] }> => {
  const proposals = await fetchProposals(pubkeys, bitpacId);
  const proposalVotes = await Promise.all(
    proposals.map((proposal) => fetchVotes(proposal.id))
  );

  proposals.forEach((proposal, index) => {
    const matchingVotes = proposalVotes[index].filter((vote) =>
      vote.tags.some((tag) => tag[0] === 'e' && tag[1] === proposal.id)
    );
    proposal.votes = matchingVotes;
  });

  return { proposals };
};

// TODO: BITPAC IS REQUIRED, I SET IT UP AS OPTIONAL TO HACK THE LINTING.
const useProposals = (bitpac?: Bitpac) => {
  const { pubkeys = [], id = '', threshold = 1 } = bitpac || {};
  const { data, isLoading, error } = useQuery(['proposals', pubkeys, id], () =>
    fetchProposalsAndVotes(pubkeys, id)
  );

  const { proposals } = data || {};

  const proposalData = proposals?.map((proposal) => {
    const proposalContent = JSON.parse(proposal.content);
    const votes = proposal.votes;

    let approvedVotes = 0;
    let rejectedVotes = 0;

    votes?.forEach((vote: any) => {
      const content = JSON.parse(vote.content);

      if (content) {
        approvedVotes += 1;
      } else {
        rejectedVotes += 1;
      }
    });

    const { threshold } = bitpac || { threshold: 0 };
    const totalVotes = approvedVotes + rejectedVotes;
    const acceptedPercentage = (approvedVotes / totalVotes) * 100;
    const rejectedPercentage = (rejectedVotes / totalVotes) * 100;

    const { id, pubkey } = proposal;
    const title = proposalContent[0];
    const inputs = proposalContent[1];
    const outputs = proposalContent[2];
    const description = proposalContent[3];

    const voters = votes?.map((vote) => {
      const content = JSON.parse(vote.content);
      
      return {
        voter: { id: vote.pubkey, link: '#' },
        voting_weight: new Date(vote.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        status: content ? 'accepted' : 'rejected',
      }
    })

    const vote: Proposal = {
      id,
      title,
      description,
      pubkey,
      inputs,
      outputs,
      accepted: {
        vote: approvedVotes,
        percentage: acceptedPercentage,
      },
      rejected: {
        vote: rejectedVotes,
        percentage: rejectedPercentage,
      },
      proposed_by: {
        id: pubkey,
        link: '#',
      },
      requiredVotesToPass: threshold,
      requiredVotesToDeny: pubkeys.length - threshold + 1,
      status: 'active',
      votes: voters || [],
      action: [],
      // @ts-ignore
      bitpac,
    };

    return vote;
  });

  return {
    current: proposalData,
    totalActiveVote: 1,
    totalPastVote: 0,
    isLoading,
    error,
  };
};

export default useProposals;
