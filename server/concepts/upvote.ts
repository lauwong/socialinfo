import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface UpvoteDoc extends BaseDoc {
  target: ObjectId;
  users: ObjectId[];
}

export default class UpvoteConcept {

  public readonly upvotes;

  constructor(collectionName: string) {
    this.upvotes = new DocCollection<UpvoteDoc>(collectionName);
  }
  
  async cast(user: ObjectId, target: ObjectId) {

    const votes = await this.upvotes.readOne({ target });

    if (!votes) {
      await this.upvotes.createOne({ target, users: [ user ] });
    } else {

      if (this.findUserInVotes(user, votes.users) !== -1) {
        throw new AlreadyUpvotedError(user, target);
      }

      votes.users.push(user);
      this.upvotes.updateOne({ target }, { users: votes.users });
    }

    return { msg: "Successfully upvoted!" };
  }

  async retract(user: ObjectId, target: ObjectId) {

    const votes = await this.upvotes.readOne({ target });

    if (!votes) {
      console.log(votes);
      throw new NotUpvotedError(user, target);
    }

    const voteIdx = this.findUserInVotes(user, votes.users);

    if (voteIdx == -1) {
      console.log(votes);
      throw new NotUpvotedError(user, target);
    }

    votes.users.splice(voteIdx, 1);
    await this.upvotes.updateOne({ target }, { users: votes.users });
    return { msg: "Upvote removed successfully!" };
  }

  async countVotes(target: ObjectId) {
    const votes = await this.upvotes.readOne({ target });
    return { msg: "Upvotes successfully tallied!", count: votes?.users.length ?? 0};
  }

  private findUserInVotes(user: ObjectId, votes: ObjectId[]): number {
    for (let i = 0; i < votes.length; i++) {
      if (user.toString() === votes[i].toString()) {
        return i;
      }
    }
    return -1;
  }

  async getMostUpvoted(items: ObjectId[]): Promise<ObjectId> {

    if (items.length === 0) {
      throw new NotAllowedError(`No items to check!`);
    }

    let top_item: ObjectId = items[0];
    let max_votes: number = -1;

    for (const item of items) {
      const curr_votes = (await this.countVotes(item)).count;
      if (curr_votes > max_votes) {
        top_item = item;
        max_votes = curr_votes;
      }
    }
    return top_item;
  }

  async isVoter(user: ObjectId, target: ObjectId) {
    const upvote = await this.upvotes.readOne({ user, target });
    if (!upvote) {
      throw new NotAllowedError(`User ${user} has not upvoted ${target}!`);
    }
  }
}

export class AlreadyUpvotedError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly target: ObjectId,
  ) {
    super("{0} already upvoted {1}!", user, target);
  }
}

export class NotUpvotedError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly target: ObjectId,
  ) {
    super("{0} has not upvoted {1}!", user, target);
  }
}